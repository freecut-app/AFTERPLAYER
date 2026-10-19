import { Database, FolderSearch, Gamepad2, LibraryBig, RefreshCw, Sparkles } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import type { LibraryInfo } from '../../../shared/types'
import { LogoMark } from '../components/Logo'
import { relativeTime } from '../lib/format'

function Card({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="rise rounded-[22px] border border-line bg-gradient-to-b from-surface to-base p-6">
      <div className="mb-4 flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-xl bg-raised/60 text-ice">{icon}</span>
        <h2 className="font-display text-[17px] font-semibold text-white">{title}</h2>
      </div>
      {children}
    </section>
  )
}

function Paths({ items, empty }: { items: string[]; empty: string }) {
  if (items.length === 0) return <p className="text-sm text-muted">{empty}</p>
  return (
    <ul className="flex flex-col gap-2">
      {items.map((p) => (
        <li key={p} className="select-text rounded-lg border border-line bg-ink/50 px-3 py-2 font-mono text-[12.5px] text-silver">
          {p}
        </li>
      ))}
    </ul>
  )
}

export function Settings({ syncing, onSync, gameCount }: { syncing: boolean; onSync(): void; gameCount: number }) {
  const [info, setInfo] = useState<LibraryInfo | null>(null)
  useEffect(() => {
    window.api.getInfo().then(setInfo)
  }, [syncing])

  return (
    <div className="page-in max-w-4xl">
      <div className="mb-8">
        <h1 className="font-display text-[34px] font-bold tracking-tight text-white">Configurações</h1>
        <p className="mt-1 text-sm text-muted">Fontes de jogos detectadas e dados locais do AFTERPLAYER.</p>
      </div>

      <div className="flex flex-col gap-5">
        <Card title="Sincronização" icon={<RefreshCw className="size-[17px]" />}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-muted">
              {gameCount} jogo(s) na biblioteca · última sincronização: <span className="text-silver">{info ? relativeTime(info.lastScanAt).toLowerCase() : '…'}</span>
            </p>
            <button
              onClick={onSync}
              disabled={syncing}
              className="flex h-10 items-center gap-2 rounded-xl bg-gradient-to-b from-white to-[#c9daea] px-5 text-[13px] font-bold tracking-wide text-ink transition hover:-translate-y-px disabled:opacity-70"
            >
              <RefreshCw className={`size-4 ${syncing ? 'animate-spin' : ''}`} /> {syncing ? 'SINCRONIZANDO…' : 'SINCRONIZAR AGORA'}
            </button>
          </div>
        </Card>

        <Card title="Pastas de jogos" icon={<FolderSearch className="size-[17px]" />}>
          <p className="mb-3 text-sm text-muted">Pastas "Games" e "Jogos" de cada unidade, verificadas primeiro e com busca nas subpastas.</p>
          {info ? <Paths items={info.gameFolders} empty="Nenhuma pasta Games encontrada." /> : <div className="skeleton h-9 rounded-lg" />}
        </Card>

        <Card title="Xbox" icon={<Gamepad2 className="size-[17px]" />}>
          <p className="mb-3 text-sm text-muted">Pastas de instalação do app Xbox / Microsoft Store (XboxGames) em cada unidade.</p>
          {info ? <Paths items={info.xboxFolders} empty="Nenhuma pasta do Xbox encontrada." /> : <div className="skeleton h-9 rounded-lg" />}
        </Card>

        <Card title="Steam" icon={<LibraryBig className="size-[17px]" />}>
          {info ? (
            <>
              <p className="mb-3 text-sm text-muted">{info.steamPath ? `Instalação: ${info.steamPath}` : 'Steam não encontrada neste computador.'}</p>
              <Paths items={info.libraries} empty="Nenhuma biblioteca Steam encontrada." />
            </>
          ) : (
            <div className="skeleton h-9 rounded-lg" />
          )}
        </Card>

        <Card title="Dados locais" icon={<Database className="size-[17px]" />}>
          <p className="mb-3 text-sm text-muted">Biblioteca, preferências e cache de imagens ficam somente neste computador.</p>
          {info ? <Paths items={[info.dataDir]} empty="" /> : <div className="skeleton h-9 rounded-lg" />}
        </Card>

        <Card title="Sobre" icon={<Sparkles className="size-[17px]" />}>
          <div className="flex items-center gap-4">
            <LogoMark size={44} />
            <div>
              <div className="font-display text-[15px] font-bold tracking-[0.22em] text-white">AFTERPLAYER</div>
              <div className="text-[12px] tracking-[0.16em] text-muted">ALL YOUR GAMES. ONE PLACE.</div>
            </div>
          </div>
          <p className="mt-4 text-sm text-muted">As animações seguem a preferência de movimento reduzido do Windows.</p>
        </Card>
      </div>
    </div>
  )
}
