import { ArrowLeft } from 'lucide-react'

/** Faixa arrastável da janela. Os controles (minimizar/maximizar/fechar) são os nativos do Windows à direita. */
export function TitleBar({ title, onBack }: { title: string; onBack?: () => void }) {
  return (
    <header className="drag absolute inset-x-0 top-0 z-30 flex h-10 items-center gap-2 pl-6 pr-[150px]">
      {onBack && (
        <button
          onClick={onBack}
          data-tip="Voltar"
          className="grid size-7 place-items-center rounded-lg text-muted transition hover:bg-white/10 hover:text-white"
        >
          <ArrowLeft className="size-4" />
        </button>
      )}
      <span className="text-[12px] font-medium tracking-wide text-muted">{title}</span>
    </header>
  )
}
