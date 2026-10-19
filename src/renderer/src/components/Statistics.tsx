import { Clock3, Gamepad2, Heart, Timer, type LucideIcon } from 'lucide-react'
import type { Game } from '../../../shared/types'
import { formatPlaytime, relativeTime } from '../lib/format'

function Tile({ icon: Icon, label, value, hint }: { icon: LucideIcon; label: string; value: string; hint?: string }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-line bg-gradient-to-b from-surface to-base p-5 transition duration-300 hover:border-line-strong">
      <div className="pointer-events-none absolute -right-6 -top-6 size-24 rounded-full bg-ice/[0.06] blur-2xl transition group-hover:bg-ice/[0.1]" />
      <div className="flex items-center gap-2.5 text-muted">
        <span className="grid size-8 place-items-center rounded-lg bg-raised/70 text-ice">
          <Icon className="size-4" />
        </span>
        <span className="text-[11.5px] font-semibold uppercase tracking-[0.14em]">{label}</span>
      </div>
      <div className="mt-4 truncate font-display text-[26px] font-semibold leading-none text-white" title={value}>
        {value}
      </div>
      {hint && <div className="mt-2 truncate text-[12px] text-muted">{hint}</div>}
    </div>
  )
}

export function Statistics({ games }: { games: Game[] }) {
  const favorites = games.filter((g) => g.favorite).length
  const playtime = games.reduce((s, g) => s + g.playtimeSeconds, 0)
  const last = games.filter((g) => g.lastLaunchedAt).sort((a, b) => b.lastLaunchedAt! - a.lastLaunchedAt!)[0]
  return (
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
      <Tile icon={Gamepad2} label="Instalados" value={String(games.length)} hint="Pasta Games, Xbox e Steam" />
      <Tile icon={Heart} label="Favoritos" value={String(favorites)} hint={favorites ? 'Marcados por você' : 'Nenhum favorito ainda'} />
      {/* Só mostra tempo quando houver sessões realmente medidas pelo app. */}
      <Tile icon={Timer} label="Tempo registrado" value={playtime > 0 ? formatPlaytime(playtime) : '—'} hint={playtime > 0 ? 'Medido pelo AFTERPLAYER' : 'Nenhuma sessão registrada'} />
      <Tile icon={Clock3} label="Último jogo" value={last?.name ?? '—'} hint={last ? relativeTime(last.lastLaunchedAt) : 'Nenhum jogo iniciado pelo app'} />
    </div>
  )
}
