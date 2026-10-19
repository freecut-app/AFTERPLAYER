import { CheckCircle2, Clock3, Heart, X, XCircle } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Game, ScanProgress, ScanResult } from '../../shared/types'
import { GameDetails } from './components/GameDetails'
import { LoadingSkeleton } from './components/LoadingSkeleton'
import { Sidebar, type View } from './components/Sidebar'
import { TitleBar } from './components/TitleBar'
import { ActionsContext, type Actions } from './lib/actions'
import { byName } from './lib/format'
import { Collection } from './pages/Collection'
import { Home } from './pages/Home'
import { Library } from './pages/Library'
import { Settings } from './pages/Settings'
import { Welcome } from './pages/Welcome'

const TITLES: Record<View, string> = { home: 'Início', library: 'Biblioteca', recent: 'Recentes', favorites: 'Favoritos', settings: 'Configurações' }

interface Toast {
  id: number
  message: string
  kind: 'success' | 'error'
}

const loadCollapsed = (): boolean => {
  try {
    return localStorage.getItem('ap.sidebar') === 'collapsed'
  } catch {
    return false
  }
}

export default function App() {
  const [games, setGames] = useState<Game[] | null>(null)
  const [firstRun, setFirstRun] = useState(false)
  const [view, setView] = useState<View>('home')
  const [detailId, setDetailId] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState(loadCollapsed)
  const [progress, setProgress] = useState<ScanProgress | null>(null)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [lastScanAt, setLastScanAt] = useState<number | null>(null)
  const [launching, setLaunching] = useState<string | null>(null)
  const [toast, setToast] = useState<Toast | null>(null)
  const mainRef = useRef<HTMLElement>(null)

  const notify = useCallback((message: string, kind: 'success' | 'error' = 'success') => setToast({ id: Date.now(), message, kind }), [])

  const reload = useCallback(() => {
    window.api.getLibrary().then((lib) => setGames(lib.games))
  }, [])

  const scan = useCallback(async () => {
    setProgress({ step: 'Iniciando…', current: 0, total: 1 })
    try {
      const res = await window.api.scan()
      setScanResult(res)
      setGames(res.games)
      setLastScanAt(Date.now())
      return res
    } finally {
      setProgress(null)
    }
  }, [])

  useEffect(() => {
    const off = window.api.onScanProgress((p) => setProgress(p.step === 'Concluído' ? null : p))
    window.api.getLibrary().then((lib) => {
      setGames(lib.games)
      setFirstRun(lib.firstRun)
      if (lib.firstRun) scan()
    })
    window.api.getInfo().then((i) => setLastScanAt(i.lastScanAt))
    return off
  }, [scan])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4200)
    return () => clearTimeout(t)
  }, [toast])

  // Volta ao topo ao trocar de página.
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 })
  }, [view, detailId])

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setDetailId(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const actions = useMemo<Actions>(
    () => ({
      launching,
      notify,
      reload,
      openDetails: (g) => setDetailId(g.id),
      play: async (g) => {
        setLaunching(g.id)
        const res = await window.api.launch(g.id)
        if (!res.ok) {
          setLaunching(null)
          notify(`Não foi possível iniciar ${g.name}: ${res.error}`, 'error')
          return
        }
        notify(g.platform === 'steam' ? `Iniciando ${g.name} pela Steam…` : g.platform === 'xbox' ? `Iniciando ${g.name} pelo Xbox…` : `Iniciando ${g.name}…`)
        setGames((list) => list?.map((x) => (x.id === g.id ? { ...x, lastLaunchedAt: Date.now() } : x)) ?? null)
        // O jogo assume a partir daqui; mantém o estado "Iniciando" por alguns segundos.
        setTimeout(() => setLaunching((cur) => (cur === g.id ? null : cur)), 6000)
      },
      toggleFavorite: async (g) => {
        const favorite = !g.favorite
        setGames((list) => list?.map((x) => (x.id === g.id ? { ...x, favorite } : x)) ?? null)
        const saved = await window.api.setFavorite(g.id, favorite)
        if (!saved) {
          setGames((list) => list?.map((x) => (x.id === g.id ? { ...x, favorite: !favorite } : x)) ?? null)
          notify('Não foi possível salvar o favorito.', 'error')
        }
      }
    }),
    [launching, notify, reload]
  )

  const visible = useMemo(() => (games ?? []).filter((g) => !g.hidden).sort(byName), [games])
  const recent = useMemo(() => visible.filter((g) => g.lastLaunchedAt).sort((a, b) => b.lastLaunchedAt! - a.lastLaunchedAt!), [visible])
  const detail = detailId ? visible.find((g) => g.id === detailId) : undefined

  const sync = (): void => {
    scan()
      .then((r) => notify(`Biblioteca sincronizada: ${r.games.length} jogo(s).`))
      .catch((e) => notify(`Falha na sincronização: ${(e as Error).message}`, 'error'))
  }

  if (firstRun) {
    return (
      <Welcome
        progress={progress}
        result={scanResult}
        onDone={() => {
          setFirstRun(false)
          setView('library')
        }}
      />
    )
  }

  let page: React.ReactNode
  if (games === null) page = <LoadingSkeleton />
  else if (detail) page = <GameDetails game={detail} />
  else if (view === 'home') page = visible.length ? <Home games={visible} onSeeAll={() => setView('library')} /> : <Library games={visible} />
  else if (view === 'library') page = <Library games={visible} />
  else if (view === 'recent')
    page = (
      <Collection
        title="Recentes"
        subtitle="Jogos iniciados pelo AFTERPLAYER, do mais recente ao mais antigo."
        games={recent}
        empty={{ icon: <Clock3 className="size-7" />, title: 'Nenhum jogo iniciado ainda', text: 'Os jogos que você abrir pelo AFTERPLAYER aparecem aqui.' }}
      />
    )
  else if (view === 'favorites')
    page = (
      <Collection
        title="Favoritos"
        subtitle="Seus jogos preferidos, sempre à mão."
        games={visible.filter((g) => g.favorite)}
        empty={{ icon: <Heart className="size-7" />, title: 'Nenhum favorito', text: 'Toque no coração de um jogo para adicioná-lo aqui.' }}
      />
    )
  else page = <Settings syncing={!!progress} onSync={sync} gameCount={visible.length} />

  return (
    <ActionsContext.Provider value={actions}>
      <div className="flex h-full bg-ink">
        <Sidebar
          view={view}
          onNavigate={(v) => {
            setView(v)
            setDetailId(null)
          }}
          collapsed={collapsed}
          onToggle={() =>
            setCollapsed((c) => {
              try {
                localStorage.setItem('ap.sidebar', c ? 'expanded' : 'collapsed')
              } catch {
                // preferência opcional
              }
              return !c
            })
          }
          gameCount={visible.length}
          lastScanAt={lastScanAt}
          syncing={!!progress}
          onSync={sync}
        />

        <div className="relative min-w-0 flex-1">
          <TitleBar title={detail ? `${TITLES[view]}  /  ${detail.name}` : TITLES[view]} onBack={detail ? () => setDetailId(null) : undefined} />
          <main ref={mainRef} className="h-full overflow-y-auto overflow-x-hidden">
            <div key={detail ? detail.id : view} className="mx-auto max-w-[1680px] px-[clamp(24px,3vw,48px)] pb-16 pt-[72px]">
              {page}
            </div>
          </main>
        </div>
      </div>

      {toast && (
        <div
          key={toast.id}
          role="status"
          className="toast-in fixed bottom-6 right-6 z-50 flex max-w-md items-center gap-3 rounded-2xl border border-line-strong bg-raised/95 py-3 pl-4 pr-3 text-[13.5px] text-silver shadow-[0_24px_50px_-20px_rgba(0,0,0,0.9)] backdrop-blur-xl"
        >
          {toast.kind === 'success' ? <CheckCircle2 className="size-[18px] shrink-0 text-ice" /> : <XCircle className="size-[18px] shrink-0 text-rose-300" />}
          <span className="flex-1">{toast.message}</span>
          <button onClick={() => setToast(null)} aria-label="Fechar" className="grid size-7 place-items-center rounded-lg text-muted hover:bg-white/10 hover:text-white">
            <X className="size-4" />
          </button>
        </div>
      )}
    </ActionsContext.Provider>
  )
}
