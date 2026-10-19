import { ChevronLeft, ChevronRight, Info } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { Game } from '../../../shared/types'
import { useActions } from '../lib/actions'
import { useGameImage } from '../lib/images'
import { CoverPlaceholder, GhostButton, Img, PlatformBadge, PlayButton } from './ui'

const ROTATE_MS = 9000
const reducedMotion = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Camada visual de um slide. Sem banner real, usa fundo grafite com a capa em destaque (sem esticar a capa). */
function SlideArt({ game, active }: { game: Game; active: boolean }) {
  const hero = useGameImage(game.id, 'hero')
  const cover = useGameImage(game.id, 'cover')
  return (
    <div className={`absolute inset-0 transition-opacity duration-1000 ease-out-soft ${active ? 'opacity-100' : 'opacity-0'}`} aria-hidden={!active}>
      {hero === undefined && <div className="skeleton absolute inset-0" />}
      {hero && (
        <Img
          src={hero}
          alt=""
          className={`absolute inset-0 size-full object-cover object-[center_30%] transition-transform duration-[9000ms] ease-linear ${active ? 'scale-[1.06]' : 'scale-100'}`}
        />
      )}
      {hero === null && (
        <div className="absolute inset-0 bg-[radial-gradient(90%_120%_at_85%_40%,#2b3647_0%,#151a23_50%,#0b0e13_100%)]">
          <div className="absolute right-[8%] top-1/2 aspect-[2/3] h-[78%] -translate-y-1/2 overflow-hidden rounded-2xl shadow-[0_30px_60px_-20px_rgba(0,0,0,0.9)] ring-1 ring-line-strong">
            {cover ? <Img src={cover} alt="" className="size-full object-cover" /> : <CoverPlaceholder game={game} />}
          </div>
        </div>
      )}
    </div>
  )
}

export function HeroBanner({ games }: { games: Game[] }) {
  const { launching, play, openDetails } = useActions()
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const count = games.length
  const current = games[Math.min(index, count - 1)]

  useEffect(() => {
    if (count < 2 || paused || reducedMotion()) return
    const t = setTimeout(() => setIndex((i) => (i + 1) % count), ROTATE_MS)
    return () => clearTimeout(t)
  }, [index, count, paused])

  if (!current) return null
  const go = (d: number): void => setIndex((i) => (i + d + count) % count)

  return (
    <section
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="rise relative h-[clamp(340px,48vh,540px)] overflow-hidden rounded-[28px] bg-surface shadow-[0_40px_80px_-40px_rgba(0,0,0,0.95)] ring-1 ring-line"
    >
      {games.map((g, i) => (
        <SlideArt key={g.id} game={g} active={i === index} />
      ))}

      {/* gradientes de legibilidade */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-ink/95 via-ink/55 to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink via-ink/10 to-transparent" />
      <div className="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-inset ring-white/[0.05]" />

      <div key={current.id} className="page-in absolute bottom-0 left-0 flex max-w-[620px] flex-col gap-5 p-[clamp(28px,4vw,52px)]">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-semibold tracking-[0.28em] text-ice">EM DESTAQUE</span>
          <span className="h-px w-8 bg-ice/40" />
          <PlatformBadge platform={current.platform} />
        </div>
        <h1 className="font-display text-[clamp(34px,4.2vw,60px)] font-bold leading-[1.02] tracking-tight text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)]">
          {current.name}
        </h1>
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <PlayButton busy={launching === current.id} onClick={() => play(current)} size="lg" label="JOGAR AGORA" />
          <GhostButton onClick={() => openDetails(current)} className="h-14 px-6">
            <Info className="size-[18px]" /> VER DETALHES
          </GhostButton>
        </div>
      </div>

      {count > 1 && (
        <div className="absolute bottom-[clamp(28px,4vw,52px)] right-[clamp(28px,4vw,52px)] flex items-center gap-4">
          <div className="flex items-center gap-2">
            {games.map((g, i) => (
              <button
                key={g.id}
                onClick={() => setIndex(i)}
                aria-label={`Destacar ${g.name}`}
                className={`h-1.5 rounded-full transition-all duration-500 ${i === index ? 'w-8 bg-ice' : 'w-1.5 bg-white/30 hover:bg-white/60'}`}
              />
            ))}
          </div>
          <div className="flex gap-1.5">
            {[
              [-1, ChevronLeft, 'Anterior'],
              [1, ChevronRight, 'Próximo']
            ].map(([d, Icon, label]) => {
              const I = Icon as typeof ChevronLeft
              return (
                <button
                  key={label as string}
                  onClick={() => go(d as number)}
                  aria-label={label as string}
                  className="grid size-9 place-items-center rounded-full border border-line-strong bg-black/30 text-silver backdrop-blur-md transition hover:bg-white/15 hover:text-white"
                >
                  <I className="size-4" />
                </button>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}
