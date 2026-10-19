import { Heart, Loader2, Play } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import type { Game } from '../../../shared/types'
import { platformLabel } from '../lib/format'
import { useGameIcon } from '../lib/images'

export function Img({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [loaded, setLoaded] = useState(false)
  return (
    <img
      src={src}
      alt={alt}
      draggable={false}
      decoding="async"
      onLoad={() => setLoaded(true)}
      className={`img-fade ${loaded ? 'loaded' : ''} ${className ?? ''}`}
    />
  )
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter((w) => /[\p{L}\p{N}]/u.test(w[0] ?? ''))
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

/** Arte de reserva quando o jogo não tem capa: ícone do executável ou iniciais. */
export function CoverPlaceholder({ game }: { game: Game }) {
  const icon = useGameIcon(game)
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[radial-gradient(120%_80%_at_50%_0%,#2a3445_0%,#151a23_55%,#0c0f15_100%)] p-4 text-center">
      {icon ? (
        <img src={icon} alt="" draggable={false} className="size-14 drop-shadow-[0_10px_24px_rgba(0,0,0,0.6)]" />
      ) : (
        <span className="font-display text-5xl font-semibold tracking-wide text-ice/70">{initials(game.name)}</span>
      )}
      <span className="line-clamp-2 font-display text-[15px] font-semibold text-white/85">{game.name}</span>
    </div>
  )
}

export function PlatformBadge({ platform, className }: { platform: Game['platform']; className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border border-line-strong bg-white/[0.04] px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted ${className ?? ''}`}
    >
      {platformLabel[platform]}
    </span>
  )
}

export function PlayButton({ busy, onClick, size = 'md', label = 'JOGAR' }: { busy: boolean; onClick: () => void; size?: 'sm' | 'md' | 'lg'; label?: string }) {
  const sizes = { sm: 'h-9 px-4 text-[13px] gap-1.5', md: 'h-11 px-6 text-sm gap-2', lg: 'h-14 px-9 text-[15px] gap-2.5' }
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      disabled={busy}
      className={`group/play relative inline-flex items-center justify-center overflow-hidden rounded-xl bg-gradient-to-b from-white to-[#c9daea] font-bold tracking-[0.08em] text-ink shadow-[0_10px_30px_-10px_rgba(165,200,232,0.8)] transition duration-200 hover:-translate-y-px hover:shadow-[0_14px_36px_-10px_rgba(165,200,232,0.95)] active:translate-y-0 active:scale-[0.98] disabled:cursor-wait ${sizes[size]}`}
    >
      {busy && <span className="absolute inset-x-0 bottom-0 h-0.5 overflow-hidden bg-ink/10"><span className="block h-full w-1/2 animate-[progress-bar_1s_ease-in-out_infinite] bg-ink/50" /></span>}
      {busy ? <Loader2 className="size-[1.15em] animate-spin" /> : <Play className="size-[1.1em] fill-current transition group-hover/play:scale-110" />}
      {busy ? 'INICIANDO…' : label}
    </button>
  )
}

export function GhostButton({ children, onClick, tip, active, className }: { children: ReactNode; onClick: () => void; tip?: string; active?: boolean; className?: string }) {
  return (
    <button
      data-tip={tip}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 text-sm font-medium backdrop-blur-md transition duration-200 hover:-translate-y-px active:translate-y-0 ${
        active ? 'border-ice/40 bg-ice/15 text-ice' : 'border-line-strong bg-white/[0.06] text-silver hover:border-white/25 hover:bg-white/[0.1] hover:text-white'
      } ${className ?? 'h-11'}`}
    >
      {children}
    </button>
  )
}

export function FavoriteButton({ active, onClick, className }: { active: boolean; onClick: () => void; className?: string }) {
  return (
    <button
      data-tip={active ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
      aria-pressed={active}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className={`grid place-items-center rounded-lg backdrop-blur-md transition duration-200 active:scale-90 ${
        active ? 'bg-ice/20 text-ice' : 'bg-black/45 text-white/80 hover:bg-black/65 hover:text-white'
      } ${className ?? 'size-8'}`}
    >
      <Heart className={`size-4 transition ${active ? 'fill-current' : ''}`} />
    </button>
  )
}

export function EmptyState({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="rise mx-auto flex max-w-md flex-col items-center py-16 text-center">
      <div className="mb-5 grid size-16 place-items-center rounded-2xl border border-line-strong bg-gradient-to-b from-raised to-surface text-muted shadow-[0_20px_40px_-20px_rgba(0,0,0,0.8)]">
        {icon}
      </div>
      <h3 className="font-display text-xl font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted">{text}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

export function SectionHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <h2 className="font-display text-[22px] font-semibold tracking-tight text-white">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
