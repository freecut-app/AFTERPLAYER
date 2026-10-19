import type { Game } from '../../../shared/types'
import { GameCard } from './GameCard'

export const gridClass = 'grid grid-cols-[repeat(auto-fill,minmax(164px,1fr))] gap-x-6 gap-y-8 min-[1700px]:grid-cols-[repeat(auto-fill,minmax(190px,1fr))]'

export function GameGrid({ games }: { games: Game[] }) {
  return (
    <div className={gridClass}>
      {games.map((g, i) => (
        <GameCard key={g.id} game={g} index={i} />
      ))}
    </div>
  )
}
