import { useEffect, useState } from 'react'
import type { Game, ImageKind } from '../../../shared/types'

// Cache compartilhado das URLs de imagem: undefined = carregando, null = indisponível.
const cache = new Map<string, string | null>()
const listeners = new Set<() => void>()
const notify = (): void => listeners.forEach((l) => l())

function useCached(key: string, load: () => Promise<string | null>): string | null | undefined {
  const [, rerender] = useState(0)
  useEffect(() => {
    const l = (): void => rerender((n) => n + 1)
    listeners.add(l)
    return () => void listeners.delete(l)
  }, [])
  useEffect(() => {
    if (cache.has(key)) return
    load()
      .catch(() => null)
      .then((s) => {
        cache.set(key, s)
        notify()
      })
  }, [key])
  return cache.get(key)
}

export const useGameImage = (id: string, kind: ImageKind) => useCached(`${id}:${kind}`, () => window.api.getImage(id, kind))

export const useGameIcon = (game: Game) =>
  useCached(`${game.id}:icon`, () => (game.platform !== 'steam' ? window.api.getIcon(game.id) : Promise.resolve(null)))

/** Abre o seletor de imagem; retorna true se a imagem foi trocada. */
export async function chooseImage(id: string, kind: ImageKind): Promise<boolean> {
  const url = await window.api.chooseImage(id, kind)
  if (!url) return false
  cache.set(`${id}:${kind}`, url)
  notify()
  return true
}
