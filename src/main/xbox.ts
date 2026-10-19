import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

export interface XboxGame {
  id: string
  name: string
  installDir: string
  exePath: string | null
  /** AppUserModelID usado para iniciar pelo Windows: "<PackageFamilyName>!<AppId>". */
  aumid: string
  storeId: string | null
}

// Executáveis que só redirecionam para outro app (ex: Minecraft: Java Edition abre o Minecraft Launcher).
const STUB_EXES = /placeholder|stub/i

export const AUMID = /^[\w.-]+_[a-z0-9]{13}![\w.-]+$/i

const xboxId = (pfn: string): string => 'xbox:' + createHash('sha1').update(pfn.toLowerCase()).digest('hex').slice(0, 12)

/** Pastas de instalação do app Xbox: lidas de X:\.GamingRoot (UTF-16 após o cabeçalho "RGBX") ou o padrão X:\XboxGames. */
export async function findXboxFolders(): Promise<string[]> {
  const out: string[] = []
  for (let c = 67; c <= 90; c++) {
    const drive = `${String.fromCharCode(c)}:\\`
    if (!existsSync(drive)) continue
    let names = ['XboxGames']
    try {
      const buf = await readFile(join(drive, '.GamingRoot'))
      if (buf.subarray(0, 4).toString('ascii') === 'RGBX') {
        const listed = buf.subarray(8).toString('utf16le').split('\0').filter(Boolean)
        if (listed.length) names = listed
      }
    } catch {
      // sem .GamingRoot: usa o nome padrão
    }
    for (const n of names) {
      const p = join(drive, n)
      if (existsSync(p) && !out.includes(p)) out.push(p)
    }
  }
  return out
}

const decode = (s: string): string =>
  s.replace(/&amp;/g, '&').replace(/&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>')

interface Config {
  identity: string
  name: string | null
  exe: string | null
  storeId: string | null
}

/** Lê o MicrosoftGame.config (apenas leitura) de um jogo instalado pelo app Xbox. */
async function readConfig(file: string): Promise<Config | null> {
  try {
    const text = (await readFile(file, 'utf8')).replace(/<!--[\s\S]*?-->/g, '')
    const identity = /<Identity\b[^>]*?\bName="([^"]+)"/.exec(text)?.[1]
    if (!identity) return null
    const name = /<ShellVisuals\b[^>]*?\bDefaultDisplayName="([^"]+)"/.exec(text)?.[1]
    return {
      identity,
      name: name && !name.startsWith('ms-resource:') ? decode(name) : null,
      exe: /<Executable\b[^>]*?\bName="([^"]+)"/.exec(text)?.[1] ?? null,
      storeId: /<StoreId>\s*([A-Z0-9]{12})\s*<\/StoreId>/i.exec(text)?.[1] ?? null
    }
  } catch {
    return null
  }
}

/** Para cada pacote, o PackageFamilyName e o Id do aplicativo registrados no Windows (só pacotes instalados para este usuário). */
function readPackages(names: string[]): Promise<Record<string, { pfn: string; app: string }>> {
  if (names.length === 0) return Promise.resolve({})
  const script =
    '[Console]::OutputEncoding=[Text.Encoding]::UTF8;$r=@{};foreach($n in ($env:GLP_NAMES|ConvertFrom-Json)){try{$p=Get-AppxPackage -Name $n|Select-Object -First 1;if($p){$a=@(($p|Get-AppxPackageManifest).Package.Applications.Application)[0].Id;if($a){$r[$n]=@{pfn=$p.PackageFamilyName;app=$a}}}}catch{}};$r|ConvertTo-Json -Compress'
  return new Promise((resolve) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', script],
      { windowsHide: true, env: { ...process.env, GLP_NAMES: JSON.stringify(names) }, timeout: 30000 },
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

export async function scanXbox(roots: string[]): Promise<{ games: XboxGame[]; errors: string[] }> {
  const errors: string[] = []
  const found: { dir: string; cfg: Config }[] = []
  for (const root of roots) {
    let dirs: string[]
    try {
      dirs = (await readdir(root, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => join(root, d.name))
    } catch (e) {
      errors.push(`Falha ao ler ${root}: ${(e as Error).message}`)
      continue
    }
    for (const dir of dirs) {
      const cfg = await readConfig(join(dir, 'Content', 'MicrosoftGame.config'))
      if (cfg && !(cfg.exe && STUB_EXES.test(cfg.exe))) found.push({ dir, cfg })
    }
  }

  const packages = await readPackages([...new Set(found.map((f) => f.cfg.identity))])
  const games: XboxGame[] = []
  for (const { dir, cfg } of found) {
    const pkg = packages[cfg.identity]
    if (!pkg) continue // pasta sem pacote registrado (desinstalado ou de outro usuário)
    const aumid = `${pkg.pfn}!${pkg.app}`
    if (!AUMID.test(aumid) || games.some((g) => g.aumid === aumid)) continue
    const exe = cfg.exe ? join(dir, 'Content', cfg.exe) : null
    games.push({
      id: xboxId(pkg.pfn),
      name: cfg.name ?? dir.split('\\').pop()!,
      installDir: dir,
      exePath: exe && existsSync(exe) ? exe : null,
      aumid,
      storeId: cfg.storeId
    })
  }
  return { games, errors }
}
