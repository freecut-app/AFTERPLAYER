import { app } from 'electron'
import { existsSync } from 'node:fs'
import { readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Game } from '../shared/types'

// v2: adiciona jogos da pasta Games. Bibliotecas antigas passam por nova detecção na abertura.
const VERSION = 2

interface Data {
  version: number
  lastScanAt: number | null
  games: Game[]
}

const file = (): string => join(app.getPath('userData'), 'library.json')

let data: Data = { version: VERSION, lastScanAt: null, games: [] }
let firstRun = true

export async function loadStore(): Promise<void> {
  if (!existsSync(file())) return
  try {
    const parsed = JSON.parse(await readFile(file(), 'utf8')) as Data
    if (Array.isArray(parsed.games)) {
      data = parsed
      firstRun = parsed.version !== VERSION
    }
  } catch {
    // Arquivo corrompido: começa vazio e uma nova detecção recria a biblioteca.
  }
}

let writing: Promise<void> = Promise.resolve()

export function saveStore(): Promise<void> {
  // Escrita atômica e serializada para não corromper o JSON.
  writing = writing.then(async () => {
    const tmp = file() + '.tmp'
    await writeFile(tmp, JSON.stringify(data, null, 2), 'utf8')
    await rename(tmp, file())
  })
  return writing
}

export const isFirstRun = (): boolean => firstRun
export const getGames = (): Game[] => data.games
export const getLastScanAt = (): number | null => data.lastScanAt
export const getGame = (id: string): Game | undefined => data.games.find((g) => g.id === id)

/** Substitui a lista pelo resultado da detecção, preservando dados do usuário. */
export type FoundGame = Pick<Game, 'id' | 'platform' | 'appId' | 'exePath' | 'name' | 'installDir' | 'aumid' | 'storeId'>

export async function mergeScan(found: FoundGame[]): Promise<Game[]> {
  const old = new Map(data.games.map((g) => [g.id, g]))
  data.games = found.map((f) => {
    const prev = old.get(f.id)
    return {
      ...f,
      favorite: prev?.favorite ?? false,
      hidden: prev?.hidden ?? false,
      addedAt: prev?.addedAt ?? Date.now(),
      lastLaunchedAt: prev?.lastLaunchedAt ?? null,
      playtimeSeconds: prev?.playtimeSeconds ?? 0,
      images: prev?.images,
      artAppId: prev?.artAppId,
      launchPath: prev?.launchPath
    }
  })
  data.lastScanAt = Date.now()
  data.version = VERSION
  firstRun = false
  await saveStore()
  return data.games
}
