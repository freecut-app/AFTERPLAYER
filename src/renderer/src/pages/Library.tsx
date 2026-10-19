import { SearchX } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { Game } from '../../../shared/types'
import { GameGrid } from '../components/GameGrid'
import { LibraryToolbar, type Filter, type Sort } from '../components/LibraryToolbar'
import { EmptyState } from '../components/ui'
import { byName } from '../lib/format'

function readPref<T extends string>(key: string, fallback: T): T {
  try {
    return (localStorage.getItem(key) as T) || fallback
  } catch {
    return fallback
  }
}
function writePref(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // preferências são opcionais
  }
}

export function Library({ games }: { games: Game[] }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>(() => readPref('ap.filter', 'all'))
  const [sort, setSort] = useState<Sort>(() => readPref('ap.sort', 'name'))

  const counts = useMemo(
    () => ({
      all: games.length,
      steam: games.filter((g) => g.platform === 'steam').length,
      xbox: games.filter((g) => g.platform === 'xbox').length,
      local: games.filter((g) => g.platform === 'local').length,
      favorites: games.filter((g) => g.favorite).length
    }),
    [games]
  )

  const list = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('pt-BR')
    const out = games.filter(
      (g) =>
        (filter === 'all' || (filter === 'favorites' ? g.favorite : g.platform === filter)) && (!q || g.name.toLocaleLowerCase('pt-BR').includes(q))
    )
    if (sort === 'recent') return out.sort((a, b) => (b.lastLaunchedAt ?? 0) - (a.lastLaunchedAt ?? 0) || byName(a, b))
    if (sort === 'playtime') return out.sort((a, b) => b.playtimeSeconds - a.playtimeSeconds || byName(a, b))
    return out.sort(byName)
  }, [games, query, filter, sort])

  return (
    <div className="page-in">
      <div className="mb-8">
        <h1 className="font-display text-[34px] font-bold tracking-tight text-white">Biblioteca</h1>
        <p className="mt-1 text-sm text-muted">Todos os seus jogos instalados, em um só lugar.</p>
      </div>
      <div className="sticky top-0 z-10 -mx-2 mb-8 rounded-2xl bg-ink/80 px-2 py-3 backdrop-blur-xl">
        <LibraryToolbar
          query={query}
          onQuery={setQuery}
          filter={filter}
          onFilter={(f) => {
            setFilter(f)
            writePref('ap.filter', f)
          }}
          sort={sort}
          onSort={(s) => {
            setSort(s)
            writePref('ap.sort', s)
          }}
          counts={counts}
        />
      </div>
      {list.length > 0 ? (
        <GameGrid key={`${filter}-${sort}`} games={list} />
      ) : (
        <EmptyState
          icon={<SearchX className="size-7" />}
          title="Nenhum jogo encontrado"
          text={query ? `Nada corresponde a "${query}" com os filtros atuais.` : 'Nenhum jogo neste filtro.'}
        />
      )}
    </div>
  )
}
