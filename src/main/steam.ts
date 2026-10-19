import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import { join, normalize } from 'node:path'
import { getKey, parseVdf, type VdfNode } from './vdf'

export interface SteamApp {
  appId: string
  name: string
  installDir: string
}

// AppIDs de ferramentas/redistribuíveis que não são jogos.
const NON_GAMES = new Set(['228980', '1070560', '1391110', '1628350', '1493710'])

function regQuery(key: string, value: string): Promise<string | null> {
  return new Promise((resolve) => {
    execFile('reg', ['query', key, '/v', value], { windowsHide: true }, (err, stdout) => {
      if (err) return resolve(null)
      const m = stdout.match(new RegExp(`${value}\\s+REG_\\w+\\s+(.+)`, 'i'))
      resolve(m ? m[1].trim() : null)
    })
  })
}

export async function findSteamPath(): Promise<string | null> {
  const candidates = [
    await regQuery('HKCU\\Software\\Valve\\Steam', 'SteamPath'),
    await regQuery('HKLM\\SOFTWARE\\WOW6432Node\\Valve\\Steam', 'InstallPath'),
    await regQuery('HKLM\\SOFTWARE\\Valve\\Steam', 'InstallPath'),
    'C:\\Program Files (x86)\\Steam',
    'C:\\Program Files\\Steam'
  ]
  for (const c of candidates) {
    if (c && existsSync(join(c, 'steam.exe'))) return normalize(c)
  }
  return null
}

async function readVdf(file: string): Promise<VdfNode | null> {
  try {
    return parseVdf(await readFile(file, 'utf8'))
  } catch {
    return null
  }
}

/** Retorna as pastas de biblioteca Steam (cada uma contém "steamapps"). */
export async function findLibraries(steamPath: string | null): Promise<string[]> {
  const libs = new Set<string>()
  const add = (p: string): void => {
    const norm = normalize(p)
    if (existsSync(join(norm, 'steamapps'))) libs.add(norm)
  }

  if (steamPath) {
    add(steamPath)
    for (const f of ['steamapps\\libraryfolders.vdf', 'config\\libraryfolders.vdf']) {
      const root = await readVdf(join(steamPath, f))
      const folders = (getKey(root ?? undefined, 'libraryfolders') ?? getKey(root ?? undefined, 'LibraryFolders')) as VdfNode | undefined
      if (!folders || typeof folders !== 'object') continue
      for (const v of Object.values(folders)) {
        if (typeof v === 'string' && /^[a-z]:\\/i.test(v)) add(v) // formato antigo
        else if (typeof v === 'object') {
          const p = getKey(v, 'path')
          if (typeof p === 'string') add(p)
        }
      }
    }
  }

  // Fallback: locais conhecidos de bibliotecas em cada unidade (sem varredura do disco).
  const known = ['SteamLibrary', 'Steam', 'Program Files (x86)\\Steam', 'Program Files\\Steam', 'Games\\SteamLibrary', 'Games\\Steam']
  for (let c = 67; c <= 90; c++) {
    const drive = `${String.fromCharCode(c)}:\\`
    if (!existsSync(drive)) continue
    for (const k of known) add(join(drive, k))
  }

  // Remove duplicatas que diferem só em maiúsculas.
  const seen = new Map<string, string>()
  for (const l of libs) if (!seen.has(l.toLowerCase())) seen.set(l.toLowerCase(), l)
  return [...seen.values()]
}

export async function readLibraryApps(library: string): Promise<SteamApp[]> {
  const steamapps = join(library, 'steamapps')
  let files: string[]
  try {
    files = await readdir(steamapps)
  } catch {
    return []
  }
  const apps: SteamApp[] = []
  for (const f of files) {
    if (!/^appmanifest_\d+\.acf$/i.test(f)) continue
    const root = await readVdf(join(steamapps, f))
    const state = getKey(root ?? undefined, 'AppState') as VdfNode | undefined
    if (!state || typeof state !== 'object') continue
    const appId = getKey(state, 'appid')
    const name = getKey(state, 'name')
    const dir = getKey(state, 'installdir')
    const flags = Number(getKey(state, 'StateFlags') ?? 0)
    if (typeof appId !== 'string' || !/^\d+$/.test(appId) || NON_GAMES.has(appId)) continue
    if (typeof name !== 'string' || typeof dir !== 'string') continue
    if ((flags & 4) === 0) continue // bit 4 = totalmente instalado
    const installDir = join(steamapps, 'common', dir)
    if (!existsSync(installDir)) continue
    apps.push({ appId, name, installDir })
  }
  return apps
}
