import { ArrowDownAZ, Search, X } from 'lucide-react'

export type Filter = 'all' | 'steam' | 'xbox' | 'local' | 'favorites'
export type Sort = 'name' | 'recent' | 'playtime'

interface Props {
  query: string
  onQuery(q: string): void
  filter: Filter
  onFilter(f: Filter): void
  sort: Sort
  onSort(s: Sort): void
  counts: Record<Filter, number>
}

const FILTER_LABELS: Record<Filter, string> = { all: 'Todos', steam: 'Steam', xbox: 'Xbox', local: 'Outros', favorites: 'Favoritos' }

export function LibraryToolbar({ query, onQuery, filter, onFilter, sort, onSort, counts }: Props) {
  // Mostra só plataformas realmente detectadas, além dos filtros gerais.
  const filters = (['all', 'steam', 'xbox', 'local', 'favorites'] as Filter[]).filter((f) => f === 'all' || f === 'favorites' || counts[f] > 0)
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex flex-wrap items-center gap-1 rounded-xl border border-line bg-base p-1">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => onFilter(f)}
            aria-pressed={filter === f}
            className={`flex h-8 items-center gap-2 rounded-lg px-3.5 text-[13px] font-medium transition-all duration-200 ${
              filter === f ? 'bg-raised text-white shadow-[0_4px_14px_-6px_rgba(0,0,0,0.8)] ring-1 ring-ice/25' : 'text-muted hover:text-silver'
            }`}
          >
            {FILTER_LABELS[f]}
            <span className={`text-[11px] tabular-nums ${filter === f ? 'text-ice' : 'text-muted/70'}`}>{counts[f]}</span>
          </button>
        ))}
      </div>

      <div className="ml-auto flex items-center gap-3">
        <label className="group relative flex h-10 w-[min(300px,40vw)] items-center rounded-xl border border-line bg-base transition focus-within:border-ice/40 focus-within:bg-surface">
          <Search className="ml-3.5 size-4 shrink-0 text-muted transition group-focus-within:text-ice" />
          <input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Buscar na biblioteca"
            className="h-full w-full bg-transparent px-3 text-[13.5px] text-white outline-none placeholder:text-muted/70"
            spellCheck={false}
          />
          {query && (
            <button onClick={() => onQuery('')} aria-label="Limpar busca" className="mr-2 grid size-6 place-items-center rounded-md text-muted hover:bg-white/10 hover:text-white">
              <X className="size-3.5" />
            </button>
          )}
        </label>
        <label className="relative flex h-10 items-center gap-2 rounded-xl border border-line bg-base pl-3.5 pr-2 text-[13px] text-muted">
          <ArrowDownAZ className="size-4" />
          <select
            value={sort}
            onChange={(e) => onSort(e.target.value as Sort)}
            className="h-full cursor-pointer bg-transparent pr-1 text-silver outline-none [&>option]:bg-surface"
            aria-label="Ordenar"
          >
            <option value="name">Nome (A–Z)</option>
            <option value="recent">Jogados recentemente</option>
            <option value="playtime">Tempo registrado</option>
          </select>
        </label>
      </div>
    </div>
  )
}
