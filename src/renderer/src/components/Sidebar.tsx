import { Clock3, Heart, House, LibraryBig, PanelLeftClose, PanelLeftOpen, RefreshCw, Settings, type LucideIcon } from 'lucide-react'
import { relativeTime } from '../lib/format'
import { LogoHorizontal } from './Logo'

export type View = 'home' | 'library' | 'recent' | 'favorites' | 'settings'

const ITEMS: { id: View; label: string; icon: LucideIcon }[] = [
  { id: 'home', label: 'Início', icon: House },
  { id: 'library', label: 'Biblioteca', icon: LibraryBig },
  { id: 'recent', label: 'Recentes', icon: Clock3 },
  { id: 'favorites', label: 'Favoritos', icon: Heart }
]

interface Props {
  view: View
  onNavigate(v: View): void
  collapsed: boolean
  onToggle(): void
  gameCount: number
  lastScanAt: number | null
  syncing: boolean
  onSync(): void
}

export function Sidebar({ view, onNavigate, collapsed, onToggle, gameCount, lastScanAt, syncing, onSync }: Props) {
  const item = (id: View, label: string, Icon: LucideIcon) => {
    const active = view === id
    return (
      <button
        key={id}
        onClick={() => onNavigate(id)}
        data-tip={collapsed ? label : undefined}
        data-tip-side="right"
        aria-current={active ? 'page' : undefined}
        className={`group relative flex h-11 items-center gap-3.5 rounded-xl px-3.5 text-[14px] font-medium transition-colors duration-200 ${
          active ? 'bg-gradient-to-r from-ice/[0.14] to-ice/[0.03] text-white' : 'text-muted hover:bg-white/[0.04] hover:text-silver'
        }`}
      >
        <span
          className={`absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-ice shadow-[0_0_12px_rgba(165,200,232,0.8)] transition-all duration-300 ${
            active ? 'opacity-100' : 'h-0 opacity-0'
          }`}
        />
        <Icon className={`size-[19px] shrink-0 transition-colors ${active ? 'text-ice' : 'group-hover:text-silver'}`} strokeWidth={active ? 2.2 : 1.8} />
        <span className={`whitespace-nowrap transition-opacity duration-200 ${collapsed ? 'pointer-events-none opacity-0' : 'opacity-100'}`}>{label}</span>
      </button>
    )
  }

  return (
    <aside
      className={`relative z-20 flex h-full shrink-0 flex-col border-r border-line bg-gradient-to-b from-base to-[#0c0f15] transition-[width] duration-300 ease-out-soft ${
        collapsed ? 'w-[76px]' : 'w-[248px]'
      }`}
    >
      <div className="drag flex h-[88px] items-center px-[18px]">
        <LogoHorizontal collapsed={collapsed} slogan />
      </div>

      <nav className="flex flex-col gap-1 px-3">
        <div className={`mb-2 px-3.5 text-[10.5px] font-semibold tracking-[0.2em] text-muted/60 transition-opacity ${collapsed ? 'opacity-0' : ''}`}>MENU</div>
        {ITEMS.map((i) => item(i.id, i.label, i.icon))}
        <div className="mx-3 my-3 h-px bg-line" />
        {item('settings', 'Configurações', Settings)}
      </nav>

      <div className="mt-auto flex flex-col gap-2 p-3">
        {!collapsed ? (
          <div className="rounded-2xl border border-line bg-surface/70 p-3.5">
            <div className="flex items-center gap-2 text-[12px] font-medium text-silver">
              <span className={`size-1.5 rounded-full ${syncing ? 'animate-pulse bg-ice' : 'bg-emerald-400/90'}`} />
              {syncing ? 'Sincronizando…' : 'Biblioteca atualizada'}
            </div>
            <div className="mt-1 text-[11.5px] text-muted">
              {gameCount} jogo(s) · {syncing ? 'procurando jogos' : relativeTime(lastScanAt).toLowerCase()}
            </div>
            <button
              onClick={onSync}
              disabled={syncing}
              className="mt-3 flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-line-strong bg-raised/60 text-[12.5px] font-medium text-silver transition hover:border-ice/40 hover:text-white disabled:opacity-60"
            >
              <RefreshCw className={`size-3.5 ${syncing ? 'animate-spin' : ''}`} /> {syncing ? 'Sincronizando' : 'Sincronizar'}
            </button>
          </div>
        ) : (
          <button
            onClick={onSync}
            disabled={syncing}
            data-tip="Sincronizar biblioteca"
            data-tip-side="right"
            className="grid h-11 place-items-center rounded-xl text-muted transition hover:bg-white/[0.04] hover:text-silver"
          >
            <RefreshCw className={`size-[18px] ${syncing ? 'animate-spin text-ice' : ''}`} />
          </button>
        )}
        <button
          onClick={onToggle}
          data-tip={collapsed ? 'Expandir menu' : undefined}
          data-tip-side="right"
          className="flex h-10 items-center gap-3 rounded-xl px-3.5 text-[13px] text-muted transition hover:bg-white/[0.04] hover:text-silver"
        >
          {collapsed ? <PanelLeftOpen className="size-[18px] shrink-0" /> : <PanelLeftClose className="size-[18px] shrink-0" />}
          <span className={`whitespace-nowrap transition-opacity ${collapsed ? 'opacity-0' : ''}`}>Recolher menu</span>
        </button>
      </div>
    </aside>
  )
}
