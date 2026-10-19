import type { ReactNode } from 'react'
import type { Game } from '../../../shared/types'
import { GameGrid } from '../components/GameGrid'
import { EmptyState } from '../components/ui'

/** Página simples com título + grade (Recentes, Favoritos). */
export function Collection({ title, subtitle, games, empty }: { title: string; subtitle: string; games: Game[]; empty: { icon: ReactNode; title: string; text: string } }) {
  return (
    <div className="page-in">
      <div className="mb-8">
        <h1 className="font-display text-[34px] font-bold tracking-tight text-white">{title}</h1>
        <p className="mt-1 text-sm text-muted">{subtitle}</p>
      </div>
      {games.length > 0 ? <GameGrid games={games} /> : <EmptyState {...empty} />}
    </div>
  )
}
