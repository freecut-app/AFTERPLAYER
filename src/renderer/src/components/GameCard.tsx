import type { Game } from '../../../shared/types'
import { useActions } from '../lib/actions'
import { useGameImage } from '../lib/images'
import { CoverPlaceholder, FavoriteButton, Img, PlatformBadge, PlayButton } from './ui'

export function GameCard({ game, index = 0 }: { game: Game; index?: number }) {
  const { launching, play, toggleFavorite, openDetails } = useActions()
  const cover = useGameImage(game.id, 'cover')
  const busy = launching === game.id

  return (
    <article className="rise group" style={{ animationDelay: `${Math.min(index, 18) * 35}ms` }}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => openDetails(game)}
        onKeyDown={(e) => e.key === 'Enter' && openDetails(game)}
        aria-label={`Ver detalhes de ${game.name}`}
        className="relative aspect-[2/3] cursor-pointer overflow-hidden rounded-[18px] bg-surface shadow-[0_14px_30px_-18px_rgba(0,0,0,0.9)] ring-1 ring-line transition-[transform,box-shadow] duration-300 ease-out-soft will-change-transform group-hover:-translate-y-1.5 group-hover:shadow-[0_22px_44px_-16px_rgba(165,200,232,0.38)] group-hover:ring-ice/35"
      >
        {cover === undefined && <div className="skeleton absolute inset-0" />}
        {cover === null && <CoverPlaceholder game={game} />}
        {cover && (
          <Img src={cover} alt={game.name} className="absolute inset-0 size-full object-cover transition-transform duration-500 ease-out-soft group-hover:scale-[1.06]" />
        )}

        {/* brilho sutil no topo para profundidade */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.06] via-transparent to-transparent" />

        <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/90 via-black/35 to-black/10 p-3.5 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100">
          <div className="translate-y-2 transition-transform duration-300 ease-out-soft group-hover:translate-y-0">
            <PlayButton busy={busy} onClick={() => play(game)} size="sm" />
          </div>
        </div>

        <FavoriteButton
          active={game.favorite}
          onClick={() => toggleFavorite(game)}
          className={`absolute right-2.5 top-2.5 size-8 transition-opacity duration-200 ${game.favorite ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
        />
        {busy && <div className="absolute inset-0 animate-pulse rounded-[18px] ring-2 ring-inset ring-ice/70" />}
      </div>

      <div className="mt-3 px-1">
        <h3 className="truncate text-[14px] font-semibold text-silver transition-colors group-hover:text-white" title={game.name}>
          {game.name}
        </h3>
        <div className="mt-1.5 flex items-center gap-2">
          <PlatformBadge platform={game.platform} />
        </div>
      </div>
    </article>
  )
}
