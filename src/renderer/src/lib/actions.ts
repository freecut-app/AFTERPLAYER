import { createContext, useContext } from 'react'
import type { Game } from '../../../shared/types'

export interface Actions {
  launching: string | null
  play(game: Game): void
  toggleFavorite(game: Game): void
  openDetails(game: Game): void
  notify(message: string, kind?: 'success' | 'error'): void
  /** Recarrega a biblioteca do processo principal (após mudanças feitas lá). */
  reload(): void
}

export const ActionsContext = createContext<Actions | null>(null)

export function useActions(): Actions {
  const a = useContext(ActionsContext)
  if (!a) throw new Error('ActionsContext ausente')
  return a
}
