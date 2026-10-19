import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, type Dirent } from 'node:fs'
import { readdir, readFile, stat } from 'node:fs/promises'
import { basename, dirname, join, normalize } from 'node:path'

export interface FolderGame {
  id: string
  name: string
  exePath: string
  installDir: string
}

// Pastas que nunca contêm o executável principal do jogo.
const SKIP_DIRS = /^(_?redist(ributables?)?|_commonredist|commonredist|__installer|installers?|directx|dotnet|vcredist|vc|support|prerequisites?|crashpad|crashreport(er)?|easyanticheat|battleye|eaanticheat|_data|engine|tools?|docs?|manual)$/i
// Executáveis auxiliares: desinstaladores, instaladores, redistribuíveis, crash handlers, anti-cheat, redirecionadores.
const SKIP_EXES = /unins|setup|install|redist|oalinst|dotnetfx|crashhandler|crashreport|crash_reporter|crashpad|anticheat|cleanup|touchup|prereq|updater|patcher|redirector|cefprocess|helper|configurator/i
// Utilitários conhecidos que costumam ficar em pastas de jogos mas não são jogos.
const NON_GAME_PRODUCTS = /lossless ?scaling|script ?hook|rockstar games launcher|social club|cheat engine|wemod|trainer/i
const GENERIC_PRODUCTS = /^(unity|unreal|game|launcher|bootstrap|.*redirector.*)$/i

const MAX_DEPTH = 4

export const localId = (exePath: string): string =>
  'local:' + createHash('sha1').update(exePath.toLowerCase()).digest('hex').slice(0, 12)

/** Pastas "Games" conhecidas em cada unidade, na ordem de prioridade. */
export function findGameFolders(): string[] {
  const out: string[] = []
  for (let c = 67; c <= 90; c++) {
    const drive = `${String.fromCharCode(c)}:\\`
    if (!existsSync(drive)) continue
    for (const name of ['Games', 'Jogos']) {
      const p = join(drive, name)
      if (existsSync(p)) out.push(p)
    }
  }
  return out
}

async function safeReaddir(dir: string): Promise<Dirent[]> {
  try {
    return await readdir(dir, { withFileTypes: true })
  } catch {
    return []
  }
}

interface Candidate {
  path: string
  size: number
  unity: boolean
  depth: number
}

async function collectExes(dir: string, depth: number, out: Candidate[]): Promise<void> {
  if (depth > MAX_DEPTH) return
  const entries = await safeReaddir(dir)
  const dirNames = new Set(entries.filter((e) => e.isDirectory()).map((e) => e.name.toLowerCase()))
  for (const e of entries) {
    if (e.isSymbolicLink()) continue
    const full = join(dir, e.name)
    if (e.isDirectory()) {
      if (!SKIP_DIRS.test(e.name) && !e.name.toLowerCase().endsWith('_data')) await collectExes(full, depth + 1, out)
    } else if (e.isFile() && /\.exe$/i.test(e.name) && !SKIP_EXES.test(e.name)) {
      const s = await stat(full).catch(() => null)
      if (!s) continue
      const stem = e.name.slice(0, -4).toLowerCase()
      out.push({ path: full, size: s.size, depth, unity: dirNames.has(`${stem}_data`) })
    }
  }
}

const squash = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, '')

function pickMain(cands: Candidate[], folderName: string): Candidate | null {
  if (cands.length === 0) return null
  const folder = squash(folderName)
  const score = (c: Candidate): number => {
    const stem = squash(basename(c.path, '.exe'))
    let s = Math.log10(c.size + 1) // executáveis maiores tendem a ser o jogo
    if (c.unity) s += 6
    if (stem.length > 2 && (folder.includes(stem) || stem.includes(folder))) s += 3
    if (/trial|demo|benchmark/.test(stem)) s -= 4
    if (/launcher|^play/.test(stem)) s -= 3 // atalhos para launchers externos
    s -= c.depth * 0.5
    return s
  }
  return [...cands].sort((a, b) => score(b) - score(a))[0]
}

/** Lê ProductName dos recursos de versão dos .exe (somente leitura, nada é executado). */
function readProductNames(paths: string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return Promise.resolve({})
  const script =
    '[Console]::OutputEncoding=[Text.Encoding]::UTF8;$r=@{};foreach($p in ($env:GLP_PATHS|ConvertFrom-Json)){try{$r[$p]=(Get-Item -LiteralPath $p).VersionInfo.ProductName}catch{}};$r|ConvertTo-Json -Compress'
  return new Promise((resolve) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', script],
      { windowsHide: true, env: { ...process.env, GLP_PATHS: JSON.stringify(paths) }, timeout: 20000 },
      (err, stdout) => {
        if (err) return resolve({})
        try {
          resolve(JSON.parse(stdout.trim() || '{}'))
        } catch {
          resolve({})
        }
      }
    )
  })
}

/** Nome do produto que o Unity grava em <Jogo>_Data/app.info (linha 2). */
async function unityName(exePath: string): Promise<string | null> {
  const info = join(dirname(exePath), `${basename(exePath, '.exe')}_Data`, 'app.info')
  try {
    const name = (await readFile(info, 'utf8')).split(/\r?\n/)[1]?.trim()
    return name || null
  } catch {
    return null
  }
}

/** Limpa nomes de pasta como "Contraband.Police.v20251120-P2P" ou "PEAK.Gamdie.com". */
export function cleanFolderName(raw: string): string {
  let s = raw
    .replace(/\.(com|net|org|ru|info)$/i, '')
    .replace(/[._]+/g, ' ')
    .replace(/\((19|20)\d{2}([-–]\d{2,4})?\)/g, '')
    .replace(/[-\s]+(p2p|codex|plaza|skidrow|reloaded|fitgirl|dodi|elamigos|repack|tenoke|rune|gog|empress|razor1911|flt|gamdie)\b.*$/i, '')
    .replace(/\s+gamdie\b.*$/i, '')
    .replace(/\s+v\d[\w.\-]*.*$/i, '')
    .replace(/\s+build\s*\d+.*$/i, '')
  return splitCamel(s.replace(/\s{2,}/g, ' ').trim() || raw)
}

/** Nomes internos sem espaço: "ContrabandPolice" -> "Contraband Police". */
function splitCamel(s: string): string {
  return /\s/.test(s) ? s : s.replace(/([a-z])([A-Z])/g, '$1 $2')
}

export async function scanGameFolders(
  roots: string[],
  exclude: string[],
  onProgress: (step: string, current: number, total: number) => void
): Promise<{ games: FolderGame[]; errors: string[] }> {
  const errors: string[] = []
  const tops: string[] = []
  for (const root of roots) {
    for (const e of await safeReaddir(root)) if (e.isDirectory() && !e.isSymbolicLink()) tops.push(join(root, e.name))
  }
  const excluded = exclude.map((d) => normalize(d).toLowerCase() + '\\')

  const picked: { exe: string; top: string }[] = []
  for (let i = 0; i < tops.length; i++) {
    onProgress(`Analisando ${tops[i]}`, i, tops.length)
    const cands: Candidate[] = []
    try {
      await collectExes(tops[i], 0, cands)
    } catch (e) {
      errors.push(`Falha ao ler ${tops[i]}: ${(e as Error).message}`)
      continue
    }
    const main = pickMain(cands, basename(tops[i]))
    if (main && !excluded.some((d) => main.path.toLowerCase().startsWith(d))) picked.push({ exe: main.path, top: tops[i] })
  }

  onProgress('Lendo nomes dos jogos…', tops.length, tops.length)
  const products = await readProductNames(picked.map((p) => p.exe))
  const games: FolderGame[] = []
  for (const { exe, top } of picked) {
    const product = products[exe]?.trim()
    if (product && NON_GAME_PRODUCTS.test(product)) continue
    const name =
      (await unityName(exe)) ??
      (product && !GENERIC_PRODUCTS.test(product) ? product : null) ??
      cleanFolderName(dirname(exe) === top ? basename(top) : basename(dirname(exe)))
    if (NON_GAME_PRODUCTS.test(name)) continue
    games.push({ id: localId(exe), name: splitCamel(name), exePath: exe, installDir: top })
  }
  return { games, errors }
}
