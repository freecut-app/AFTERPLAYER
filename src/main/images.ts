import { app, net } from 'electron'
import { existsSync } from 'node:fs'
import { copyFile, mkdir, stat, unlink, writeFile } from 'node:fs/promises'
import { extname, join } from 'node:path'
import type { ImageKind } from '../shared/types'

export type { ImageKind }

/** Copia uma imagem escolhida pelo usuário para o cache. O original não é alterado. */
export async function importCustomImage(source: string, gameId: string, kind: ImageKind, previous?: string): Promise<string> {
  const ext = extname(source).toLowerCase()
  if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) throw new Error('Formato de imagem não suportado')
  const s = await stat(source)
  if (s.size > 25 * 1024 * 1024) throw new Error('Imagem muito grande (máx. 25 MB)')
  await mkdir(cacheDir(), { recursive: true })
  const name = `custom_${gameId.replace(':', '-')}_${kind}_${Date.now()}${ext}`
  await copyFile(source, join(cacheDir(), name))
  if (previous) await unlink(join(cacheDir(), previous)).catch(() => {}) // só arquivos do próprio cache
  return name
}

const CDNS = [
  'https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps',
  'https://cdn.cloudflare.steamstatic.com/steam/apps'
]
const FILES: Record<ImageKind, string[]> = {
  cover: ['library_600x900_2x.jpg', 'library_600x900.jpg'],
  hero: ['library_hero.jpg', 'header.jpg']
}

export const cacheDir = (): string => join(app.getPath('userData'), 'images')

const squashName = (s: string): string => s.toLowerCase().replace(/[™®©]/g, '').replace(/[^a-z0-9]/g, '')

/**
 * Procura o jogo na busca pública da loja Steam e só aceita resultado com nome idêntico
 * (ignorando espaços, pontuação e ™/®). Retorna undefined se a busca falhar (ex: sem internet).
 */
export async function lookupSteamAppId(name: string): Promise<string | null | undefined> {
  try {
    const res = await net.fetch(`https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(name)}&l=english&cc=US`)
    if (!res.ok) return undefined
    const json = (await res.json()) as { items?: { id: number; name: string }[] }
    const want = squashName(name)
    const hit = json.items?.find((i) => squashName(i.name) === want)
    return hit ? String(hit.id) : null
  } catch {
    return undefined
  }
}

const misses = new Set<string>() // falhas nesta sessão, evita repetir downloads
const pending = new Map<string, Promise<string | null>>()

/** Arquivos que a própria Steam já guardou localmente (funciona offline). */
function steamLocalCandidates(steamPath: string | null, appId: string, kind: ImageKind): string[] {
  if (!steamPath) return []
  const base = join(steamPath, 'appcache', 'librarycache')
  return FILES[kind].flatMap((f) => [join(base, appId, f), join(base, `${appId}_${f}`)])
}

async function download(url: string, dest: string): Promise<boolean> {
  try {
    const res = await net.fetch(url)
    if (!res.ok || !(res.headers.get('content-type') ?? '').startsWith('image/')) return false
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length < 1024) return false
    await writeFile(dest, buf)
    return true
  } catch {
    return false
  }
}

async function storeAssetPaths(appId: string, kind: ImageKind): Promise<string[]> {
  const input = { ids: [{ appid: Number(appId) }], context: { language: 'english', country_code: 'US' }, data_request: { include_assets: true } }
  try {
    const res = await net.fetch(`https://api.steampowered.com/IStoreBrowseService/GetItems/v1/?input_json=${encodeURIComponent(JSON.stringify(input))}`)
    if (!res.ok) return []
    const json = (await res.json()) as { response?: { store_items?: { assets?: Record<string, string> }[] } }
    const a = json.response?.store_items?.[0]?.assets ?? {}
    const keys = kind === 'cover' ? ['library_capsule_2x', 'library_capsule'] : ['library_hero_2x', 'library_hero', 'header_2x', 'header']
    return keys.map((k) => a[k]).filter((p): p is string => typeof p === 'string' && /^[0-9a-f]+\/[\w.-]+\.jpg$/i.test(p))
  } catch {
    return []
  }
}

/** Retorna o nome do arquivo em cache (ex: "1677740_cover.jpg") ou null. */
export function getSteamImage(steamPath: string | null, appId: string, kind: ImageKind): Promise<string | null> {
  const name = `${appId}_${kind}.jpg`
  const dest = join(cacheDir(), name)
  if (existsSync(dest)) return Promise.resolve(name)
  if (misses.has(name)) return Promise.resolve(null)
  const running = pending.get(name)
  if (running) return running

  const job = (async () => {
    await mkdir(cacheDir(), { recursive: true })
    for (const local of steamLocalCandidates(steamPath, appId, kind)) {
      if (existsSync(local)) {
        await copyFile(local, dest)
        return name
      }
    }
    for (const file of FILES[kind]) {
      for (const cdn of CDNS) {
        if (await download(`${cdn}/${appId}/${file}`, dest)) return name
      }
    }
    // Jogos recentes guardam as imagens em caminhos com hash; a API pública da loja informa quais são.
    for (const path of await storeAssetPaths(appId, kind)) {
      if (await download(`${CDNS[0]}/${appId}/${path}`, dest)) return name
    }
    misses.add(name)
    return null
  })().finally(() => pending.delete(name))
  pending.set(name, job)
  return job
}

// Tipos de imagem do catálogo público da Microsoft Store, em ordem de preferência.
const STORE_PURPOSES: Record<ImageKind, string[]> = {
  cover: ['Poster', 'BoxArt'],
  hero: ['SuperHeroArt', 'TitledHeroArt', 'Screenshot']
}
const STORE_SIZE: Record<ImageKind, string> = { cover: 'w=600&h=900', hero: 'w=1920' }

/** Jogos do Xbox: capa e banner oficiais da página do produto na Microsoft Store. Retorna o nome em cache ou null. */
export function getXboxImage(storeId: string, kind: ImageKind): Promise<string | null> {
  const name = `xbox-${storeId}_${kind}.jpg`
  const dest = join(cacheDir(), name)
  if (existsSync(dest)) return Promise.resolve(name)
  if (misses.has(name)) return Promise.resolve(null)
  const running = pending.get(name)
  if (running) return running

  const job = (async () => {
    await mkdir(cacheDir(), { recursive: true })
    try {
      const res = await net.fetch(`https://displaycatalog.mp.microsoft.com/v7.0/products?bigIds=${storeId}&market=BR&languages=pt-br`)
      if (res.ok) {
        const json = (await res.json()) as { Products?: { LocalizedProperties?: { Images?: { ImagePurpose: string; Uri: string }[] }[] }[] }
        const images = json.Products?.[0]?.LocalizedProperties?.[0]?.Images ?? []
        for (const purpose of STORE_PURPOSES[kind]) {
          const img = images.find((i) => i.ImagePurpose === purpose && /^\/\/store-images\.s-microsoft\.com\//.test(i.Uri))
          if (img && (await download(`https:${img.Uri}?${STORE_SIZE[kind]}`, dest))) return name
        }
      }
    } catch {
      // sem internet: tenta de novo na próxima abertura
      return null
    }
    misses.add(name)
    return null
  })().finally(() => pending.delete(name))
  pending.set(name, job)
  return job
}
