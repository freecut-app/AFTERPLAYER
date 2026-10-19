import { useId } from 'react'

/** Símbolo AFTERPLAYER: um "A" geométrico cuja travessa é um triângulo de "play". */
export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  const id = useId()
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#A5C8E8" />
        </linearGradient>
      </defs>
      <path d="M13 52 L32 12 L51 52" fill="none" stroke={`url(#${id})`} strokeWidth="7.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M27.5 33 L27.5 45 L38 39 Z" fill="#A5C8E8" stroke="#A5C8E8" strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  )
}

/** Versão horizontal: símbolo + palavra AFTERPLAYER. */
export function LogoHorizontal({ collapsed, slogan }: { collapsed?: boolean; slogan?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-line-strong bg-gradient-to-b from-raised to-base shadow-[0_8px_24px_-10px_rgba(165,200,232,0.35)]">
        <LogoMark size={26} />
      </div>
      <div className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${collapsed ? 'w-0 opacity-0' : 'w-[164px] opacity-100'}`}>
        <div className="font-display text-[15px] font-bold tracking-[0.22em] text-white">AFTERPLAYER</div>
        {slogan && <div className="mt-0.5 text-[8.5px] font-semibold tracking-[0.12em] text-muted">ALL YOUR GAMES. ONE PLACE.</div>}
      </div>
    </div>
  )
}
