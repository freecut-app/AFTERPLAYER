import type { Game } from '../../../shared/types'

export const platformLabel: Record<Game['platform'], string> = { steam: 'Steam', local: 'PC', xbox: 'Xbox' }

export function relativeTime(ts: number | null): string {
  if (!ts) return 'Nunca'
  const diff = Date.now() - ts
  const min = Math.round(diff / 60000)
  if (min < 1) return 'Agora mesmo'
  if (min < 60) return `Há ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `Há ${h} h`
  const d = Math.round(h / 24)
  if (d < 7) return d === 1 ? 'Ontem' : `Há ${d} dias`
  return new Date(ts).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatPlaytime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.round((seconds % 3600) / 60)
  return h > 0 ? `${h} h ${m} min` : `${m} min`
}

export const byName = (a: Game, b: Game): number => a.name.localeCompare(b.name, 'pt-BR')
