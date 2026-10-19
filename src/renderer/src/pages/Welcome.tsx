import { ArrowRight, Loader2 } from 'lucide-react'
import type { ScanProgress, ScanResult } from '../../../shared/types'
import { LogoMark } from '../components/Logo'
import { platformLabel } from '../lib/format'

export function Welcome({ progress, result, onDone }: { progress: ScanProgress | null; result: ScanResult | null; onDone(): void }) {
  const pct = progress ? Math.round((progress.current / Math.max(progress.total, 1)) * 100) : 100
  return (
    <div className="relative flex h-full items-center justify-center overflow-hidden bg-ink px-4">
      <div className="drag absolute inset-x-0 top-0 h-10" />
      <div className="pointer-events-none absolute -top-48 left-1/2 size-[760px] -translate-x-1/2 rounded-full bg-ice/[0.09] blur-[150px]" />
      <div className="rise relative w-full max-w-xl rounded-[28px] border border-line-strong bg-gradient-to-b from-surface/95 to-base/95 p-10 shadow-[0_50px_100px_-40px_rgba(0,0,0,1)]">
        <div className="mb-8 grid size-16 place-items-center rounded-2xl border border-line-strong bg-gradient-to-b from-raised to-base">
          <LogoMark size={40} />
        </div>
        <div className="text-[11px] font-semibold tracking-[0.28em] text-ice">ALL YOUR GAMES. ONE PLACE.</div>
        <h1 className="mt-3 font-display text-[32px] font-bold tracking-tight text-white">Bem-vindo ao AFTERPLAYER</h1>
        <p className="mt-2 text-muted">Vamos encontrar seus jogos!</p>

        {!result ? (
          <div className="mt-9">
            <div className="mb-3 flex items-center gap-2 text-sm text-silver">
              <Loader2 className="size-4 shrink-0 animate-spin text-ice" />
              <span className="truncate">{progress?.step ?? 'Preparando…'}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-raised">
              <div className="h-full rounded-full bg-gradient-to-r from-ice/70 to-white transition-all duration-300" style={{ width: `${Math.max(pct, 6)}%` }} />
            </div>
          </div>
        ) : (
          <div className="mt-8">
            <div className="max-h-64 overflow-y-auto rounded-2xl border border-line bg-ink/60">
              {result.games.length === 0 && <div className="p-4 text-sm text-muted">Nenhum jogo encontrado.</div>}
              {result.games.map((g, i) => (
                <div key={g.id} className="rise flex items-center justify-between gap-4 border-b border-line px-4 py-3 text-sm last:border-0" style={{ animationDelay: `${i * 50}ms` }}>
                  <span className="truncate font-medium text-silver">{g.name}</span>
                  <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{platformLabel[g.platform]}</span>
                </div>
              ))}
            </div>
            {result.errors.map((e) => (
              <p key={e} className="mt-3 text-sm text-amber-300/90">{e}</p>
            ))}
            <button
              onClick={onDone}
              className="group mt-8 flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-white to-[#c9daea] font-bold tracking-wide text-ink shadow-[0_14px_36px_-12px_rgba(165,200,232,0.8)] transition hover:-translate-y-px"
            >
              {result.games.length} JOGO(S) ENCONTRADO(S) — ENTRAR <ArrowRight className="size-4 transition group-hover:translate-x-1" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
