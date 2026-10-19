import { app, BrowserWindow, dialog, ipcMain, net, protocol, shell } from 'electron'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { cp, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { Game, ScanProgress, ScanResult } from '../shared/types'
import { findGameFolders, scanGameFolders } from './folders'
import { cacheDir, getSteamImage, getXboxImage, importCustomImage, lookupSteamAppId, type ImageKind } from './images'
import { findLibraries, findSteamPath, readLibraryApps } from './steam'
import { getGame, getGames, getLastScanAt, isFirstRun, loadStore, mergeScan, saveStore, type FoundGame } from './store'
import { AUMID, findXboxFolders, scanXbox } from './xbox'

protocol.registerSchemesAsPrivileged([{ scheme: 'glp-img', privileges: { standard: true, secure: true, supportFetchAPI: true } }])

let win: BrowserWindow | null = null
let steamPath: string | null = null
let scanning: Promise<ScanResult> | null = null

/** Ao renomear para AFTERPLAYER a pasta de dados mudou; copia biblioteca e cache da versão anterior. */
async function migrateOldData(): Promise<void> {
  const oldDir = join(app.getPath('appData'), 'Game Launcher PRO')
  const newDir = app.getPath('userData')
  if (oldDir === newDir || !existsSync(join(oldDir, 'library.json')) || existsSync(join(newDir, 'library.json'))) return
  await mkdir(newDir, { recursive: true })
  await cp(join(oldDir, 'library.json'), join(newDir, 'library.json'))
  if (existsSync(join(oldDir, 'images'))) await cp(join(oldDir, 'images'), join(newDir, 'images'), { recursive: true })
}

function createWindow(): void {
  const icon = join(__dirname, '../../build/icon.png')
  win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 980,
    minHeight: 620,
    backgroundColor: '#090B10',
    title: 'AFTERPLAYER',
    icon: existsSync(icon) ? icon : undefined,
    // Barra de título integrada: controles nativos do Windows (com Snap Layouts) sobre o visual do app.
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: '#00000000', symbolColor: '#DCE1EA', height: 40 },
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })
  win.once('ready-to-show', () => win?.show())
  // Links externos nunca abrem dentro do app.
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  win.webContents.on('will-navigate', (e) => e.preventDefault())

  if (process.env.ELECTRON_RENDERER_URL) win.loadURL(process.env.ELECTRON_RENDERER_URL)
  else win.loadFile(join(__dirname, '../renderer/index.html'))
}

function progress(p: ScanProgress): void {
  win?.webContents.send('scan:progress', p)
}

async function runScan(): Promise<ScanResult> {
  const errors: string[] = []
  const found: FoundGame[] = []

  // 1) Pasta Games (prioridade)
  progress({ step: 'Procurando pastas Games…', current: 0, total: 1 })
  const gameFolders = findGameFolders()
  progress({ step: 'Localizando a Steam…', current: 0, total: 1 })
  steamPath = await findSteamPath()
  const libraries = await findLibraries(steamPath)

  const local = await scanGameFolders(gameFolders, libraries, (step, current, total) => progress({ step, current, total }))
  errors.push(...local.errors)
  for (const g of local.games) found.push({ id: g.id, platform: 'local', appId: null, exePath: g.exePath, name: g.name, installDir: g.installDir })

  // 2) App Xbox / Microsoft Store (pastas XboxGames)
  progress({ step: 'Procurando jogos do Xbox…', current: 0, total: 1 })
  const xboxFolders = await findXboxFolders()
  const xbox = await scanXbox(xboxFolders)
  errors.push(...xbox.errors)
  for (const g of xbox.games)
    found.push({ id: g.id, platform: 'xbox', appId: null, exePath: g.exePath, name: g.name, installDir: g.installDir, aumid: g.aumid, storeId: g.storeId })

  // 3) Steam
  if (!steamPath) errors.push('Instalação da Steam não encontrada no Registro nem nos caminhos padrão.')
  const seen = new Set<string>()
  for (let i = 0; i < libraries.length; i++) {
    progress({ step: `Lendo biblioteca Steam ${libraries[i]}`, current: i, total: libraries.length })
    try {
      for (const a of await readLibraryApps(libraries[i])) {
        if (seen.has(a.appId)) continue
        seen.add(a.appId)
        found.push({ id: `steam:${a.appId}`, platform: 'steam', appId: a.appId, exePath: null, name: a.name, installDir: a.installDir })
      }
    } catch (e) {
      errors.push(`Falha ao ler ${libraries[i]}: ${(e as Error).message}`)
    }
  }
  progress({ step: 'Concluído', current: 1, total: 1 })
  const games = await mergeScan(found)
  return { games, steamPath, libraries, gameFolders, xboxFolders, errors }
}

const artLookups = new Map<string, Promise<string | null>>()

/** AppID da Steam para as imagens de um jogo local (consultado uma vez e salvo). */
function artAppIdFor(game: Game): Promise<string | null> {
  if (game.artAppId !== undefined) return Promise.resolve(game.artAppId)
  let job = artLookups.get(game.id)
  if (!job) {
    job = lookupSteamAppId(game.name).then(async (id) => {
      if (id === undefined) return null // falha de rede: tenta de novo na próxima abertura
      game.artAppId = id
      await saveStore()
      return id
    })
    artLookups.set(game.id, job)
  }
  return job
}

const isGameId = (v: unknown): v is string => typeof v === 'string' && /^(steam:\d{1,10}|(local|xbox):[0-9a-f]{12})$/.test(v)
const isKind = (v: unknown): v is ImageKind => v === 'cover' || v === 'hero'

function launchExe(exe: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Sem shell: o caminho vem da biblioteca (detectado no processo principal), nunca da interface.
    const child = spawn(exe, [], { cwd: dirname(exe), detached: true, stdio: 'ignore', windowsHide: false })
    child.once('spawn', () => {
      child.unref()
      resolve()
    })
    child.once('error', async (err: NodeJS.ErrnoException) => {
      // Executáveis que exigem administrador: deixa o Windows exibir o UAC.
      if (err.code === 'EACCES' || err.code === 'EPERM' || err.code === 'UNKNOWN') {
        const msg = await shell.openPath(exe)
        msg ? reject(new Error(msg)) : resolve()
      } else reject(err)
    })
  })
}

function openAppsFolder(aumid: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn('explorer.exe', ['shell:AppsFolder\\' + aumid], { detached: true, stdio: 'ignore' })
    child.once('spawn', () => {
      child.unref()
      resolve()
    })
    child.once('error', reject)
  })
}

function registerIpc(): void {
  ipcMain.handle('library:get', () => ({ games: getGames(), firstRun: isFirstRun() }))

  ipcMain.handle('library:scan', () => {
    scanning ??= runScan().finally(() => (scanning = null))
    return scanning
  })

  ipcMain.handle('game:launch', async (_e, id: unknown) => {
    if (!isGameId(id)) return { ok: false, error: 'ID inválido' }
    const game = getGame(id)
    if (!game) return { ok: false, error: 'Jogo não encontrado na biblioteca' }
    try {
      if (game.platform === 'steam' && game.appId && /^\d+$/.test(game.appId)) {
        await shell.openExternal(`steam://rungameid/${game.appId}`) // protocolo oficial da Steam
      } else if (game.platform === 'local' && game.exePath) {
        const exe = game.launchPath ?? game.exePath
        if (!existsSync(exe)) return { ok: false, error: 'Executável não encontrado. Atualize a biblioteca.' }
        await launchExe(exe)
      } else if (game.platform === 'xbox' && game.aumid && AUMID.test(game.aumid)) {
        // Jogos do Xbox só podem ser iniciados pelo Windows (pacote protegido); mesmo caminho do Menu Iniciar.
        await openAppsFolder(game.aumid)
      } else return { ok: false, error: 'Jogo sem forma de inicialização conhecida' }
      game.lastLaunchedAt = Date.now()
      await saveStore()
      return { ok: true }
    } catch (e) {
      return { ok: false, error: (e as Error).message }
    }
  })

  ipcMain.handle('game:setFavorite', async (_e, id: unknown, favorite: unknown) => {
    if (!isGameId(id) || typeof favorite !== 'boolean') return null
    const game = getGame(id)
    if (!game) return null
    game.favorite = favorite
    await saveStore()
    return game
  })

  ipcMain.handle('library:info', async () => ({
    steamPath,
    gameFolders: findGameFolders(),
    xboxFolders: await findXboxFolders(),
    libraries: await findLibraries(steamPath),
    lastScanAt: getLastScanAt(),
    dataDir: app.getPath('userData')
  }))

  ipcMain.handle('game:openFolder', async (_e, id: unknown) => {
    if (!isGameId(id)) return
    const game = getGame(id)
    if (game) await shell.openPath(game.installDir)
  })

  ipcMain.handle('game:image', async (_e, id: unknown, kind: unknown) => {
    if (!isGameId(id) || !isKind(kind)) return null
    const game = getGame(id)
    if (!game) return null
    const custom = game.images?.[kind]
    if (custom && existsSync(join(cacheDir(), custom))) return `glp-img://cache/${custom}`
    if (game.platform === 'xbox' && game.storeId && /^[A-Z0-9]{12}$/i.test(game.storeId)) {
      const name = await getXboxImage(game.storeId, kind)
      if (name) return `glp-img://cache/${name}`
    }
    const appId = game.platform === 'steam' ? game.appId : await artAppIdFor(game)
    if (!appId) return null
    const name = await getSteamImage(steamPath, appId, kind)
    return name ? `glp-img://cache/${name}` : null
  })

  ipcMain.handle('game:chooseExe', async (_e, id: unknown) => {
    if (!isGameId(id) || !win) return null
    const game = getGame(id)
    if (!game || game.platform !== 'local') return null
    const res = await dialog.showOpenDialog(win, {
      title: `Executável de ${game.name}`,
      defaultPath: game.installDir,
      properties: ['openFile'],
      filters: [{ name: 'Executáveis', extensions: ['exe'] }]
    })
    if (res.canceled || !res.filePaths[0]) return null
    game.launchPath = res.filePaths[0]
    await saveStore()
    return game.launchPath
  })

  ipcMain.handle('game:icon', async (_e, id: unknown) => {
    if (!isGameId(id)) return null
    const game = getGame(id)
    if (!game?.exePath || !existsSync(game.exePath)) return null
    try {
      return (await app.getFileIcon(game.exePath, { size: 'large' })).toDataURL()
    } catch {
      return null
    }
  })

  ipcMain.handle('game:chooseImage', async (_e, id: unknown, kind: unknown) => {
    if (!isGameId(id) || !isKind(kind) || !win) return null
    const game = getGame(id)
    if (!game) return null
    const res = await dialog.showOpenDialog(win, {
      title: kind === 'cover' ? `Capa de ${game.name}` : `Banner de ${game.name}`,
      properties: ['openFile'],
      filters: [{ name: 'Imagens', extensions: ['jpg', 'jpeg', 'png', 'webp'] }]
    })
    if (res.canceled || !res.filePaths[0]) return null
    const name = await importCustomImage(res.filePaths[0], game.id, kind, game.images?.[kind])
    game.images = { ...game.images, [kind]: name }
    await saveStore()
    return `glp-img://cache/${name}`
  })
}

app.whenReady().then(async () => {
  protocol.handle('glp-img', (req) => {
    const name = decodeURIComponent(new URL(req.url).pathname.slice(1))
    if (!/^[\w-]+\.(jpg|jpeg|png|webp)$/i.test(name)) return new Response('not found', { status: 404 })
    return net.fetch(pathToFileURL(join(cacheDir(), name)).toString())
  })
  await migrateOldData().catch(() => {})
  await loadStore()
  steamPath = await findSteamPath()
  registerIpc()
  createWindow()
})

app.on('window-all-closed', () => app.quit())
