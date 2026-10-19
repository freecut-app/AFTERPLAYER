import { ArrowRight, Play } from 'lucide-react'
import type { Game } from '../../../shared/types'
import { GameGrid } from '../components/GameGrid'
import { HeroBanner } from '../components/HeroBanner'
import { Statistics } from '../components/Statistics'
import { Img, PlatformBadge, SectionHeader } from '../components/ui'
import { useActions } from '../lib/actions'
import { relativeTime } from '../lib/format'
import { useGameImage } from '../lib/images'

function ContinueCard({ game, index }: { game: Game; index: number }) {
  const { play, openDetails, launching } = useActions()
  const hero = useGameImage(game.id, 'hero')
  const cover = useGameImage(game.id, 'cover')
  const busy = launching === game.id
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => openDetails(game)}
      onKeyDown={(e) => e.key === 'Enter' && openDetails(game)}
      className="rise group relative h-[150px] cursor-pointer overflow-hidden rounded-[20px] bg-surface ring-1 ring-line transition duration-300 ease-out-soft hover:-translate-y-1 hover:shadow-[0_20px_40px_-18px_rgba(165,200,232,0.35)] hover:ring-ice/30"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {hero ? (
        <Img src={hero} alt="" className="absolute inset-0 size-full object-cover transition-transform duration-700 group-hover:scale-105" />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(100%_100%_at_100%_0%,#2b3647_0%,#151a23_60%)]" />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-ink/95 via-ink/70 to-ink/20" />
      <div className="relative flex h-full items-center gap-4 p-4">
        <div className="aspect-[2/3] h-full shrink-0 overflow-hidden rounded-xl bg-raised shadow-lg ring-1 ring-line-strong">
          {cover && <Img src={cover} alt="" className="size-full object-cover" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ice">{relativeTime(game.lastLaunchedAt)}</div>
          <div className="mt-1.5 truncate font-display text-[19px] font-semibold text-white">{game.name}</div>
          <PlatformBadge platform={game.platform} className="mt-2" />
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            play(game)
          }}
          disabled={busy}
          aria-label={`Jogar ${game.name}`}
          className="grid size-12 shrink-0 place-items-center rounded-full bg-white text-ink shadow-[0_10px_24px_-8px_rgba(165,200,232,0.9)] transition duration-300 hover:scale-105 group-hover:bg-ice disabled:animate-pulse"
        >
          <Play className="ml-0.5 size-5 fill-current" />
        </button>
      </div>
    </div>
  )
}

export function Home({ games, onSeeAll }: { games: Game[]; onSeeAll(): void }) {
  const recent = games.filter((g) => g.lastLaunchedAt).sort((a, b) => b.lastLaunchedAt! - a.lastLaunchedAt!)
  // Destaques: jogados recentemente primeiro, depois favoritos e o restante.
  const featured = [...recent, ...games.filter((g) => !g.lastLaunchedAt && g.favorite), ...games.filter((g) => !g.lastLaunchedAt && !g.favorite)].slice(0, 6)

  return (
    <div className="page-in flex flex-col gap-12">
      <HeroBanner games={featured} />
      <Statistics games={games} />

      {recent.length > 0 && (
        <section>
          <SectionHeader title="Continue de onde parou" subtitle="Jogos iniciados pelo AFTERPLAYER" />
          <div className="grid grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-5">
            {recent.slice(0, 3).map((g, i) => (
              <ContinueCard key={g.id} game={g} index={i} />
            ))}
          </div>
        </section>
      )}

      <section>
        <SectionHeader
          title="Sua biblioteca"
          subtitle={`${games.length} jogo(s) instalado(s)`}
          action={
            <button onClick={onSeeAll} className="group flex items-center gap-1.5 text-[13px] font-medium text-muted transition hover:text-ice">
              Ver biblioteca <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
            </button>
          }
        />
        <GameGrid games={games.slice(0, 12)} />
      </section>
    </div>
  )
}
