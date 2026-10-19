import { CalendarClock, FileCog, FolderOpen, HardDrive, Heart, ImagePlus, Monitor, Timer, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Game } from '../../../shared/types'
import { useActions } from '../lib/actions'
import { formatPlaytime, platformLabel, relativeTime } from '../lib/format'
import { chooseImage, useGameImage } from '../lib/images'
import { CoverPlaceholder, GhostButton, Img, PlatformBadge, PlayButton } from './ui'

function InfoRow({ icon: Icon, label, children, mono }: { icon: LucideIcon; label: string; children: ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start gap-4 border-b border-line py-4 last:border-0">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-raised/60 text-ice">
        <Icon className="size-[17px]" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-muted">{label}</div>
        <div className={`mt-1 break-all text-[14px] text-silver ${mono ? 'font-mono text-[12.5px] leading-relaxed' : ''}`}>{children}</div>
      </div>
    </div>
  )
}

export function GameDetails({ game }: { game: Game }) {
  const { launching, play, toggleFavorite, notify, reload } = useActions()
  const hero = useGameImage(game.id, 'hero')
  const cover = useGameImage(game.id, 'cover')

  const changeImage = async (kind: 'cover' | 'hero'): Promise<void> => {
    try {
      if (await chooseImage(game.id, kind)) notify(kind === 'cover' ? 'Capa atualizada.' : 'Banner atualizado.')
    } catch (e) {
      notify(`Não foi possível usar a imagem: ${(e as Error).message}`, 'error')
    }
  }
  const changeExe = async (): Promise<void> => {
    const exe = await window.api.chooseExe(game.id)
    if (!exe) return
    reload()
    notify('Executável atualizado.')
  }

  return (
    <div className="page-in -mx-[clamp(24px,3vw,48px)] -mt-[72px]">
      {/* Banner */}
      <div className="relative h-[clamp(340px,52vh,560px)] overflow-hidden">
        {hero === undefined && <div className="skeleton absolute inset-0" />}
        {hero && <Img src={hero} alt="" className="absolute inset-0 size-full scale-[1.02] object-cover object-[center_30%]" />}
        {hero === null && <div className="absolute inset-0 bg-[radial-gradient(80%_120%_at_70%_20%,#2b3647_0%,#141922_55%,#090b10_100%)]" />}
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-ink/10" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink/80 via-transparent to-transparent" />
        {/* mantém a barra de título e os controles da janela legíveis sobre banners claros */}
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-ink/75 to-transparent" />
      </div>

      {/* Conteúdo sobreposto ao banner */}
      <div className="relative -mt-[clamp(170px,22vh,240px)] px-[clamp(24px,3vw,48px)] pb-12">
        <div className="flex flex-wrap items-end gap-8">
          <div className="rise relative aspect-[2/3] w-[clamp(170px,15vw,230px)] shrink-0 overflow-hidden rounded-[20px] bg-surface shadow-[0_30px_60px_-20px_rgba(0,0,0,0.95)] ring-1 ring-line-strong">
            {cover === undefined && <div className="skeleton absolute inset-0" />}
            {cover === null && <CoverPlaceholder game={game} />}
            {cover && <Img src={cover} alt={game.name} className="absolute inset-0 size-full object-cover" />}
          </div>

          <div className="rise min-w-[280px] flex-1 pb-1" style={{ animationDelay: '80ms' }}>
            <PlatformBadge platform={game.platform} />
            <h1 className="mt-3 font-display text-[clamp(32px,3.6vw,54px)] font-bold leading-[1.04] tracking-tight text-white">{game.name}</h1>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <PlayButton busy={launching === game.id} onClick={() => play(game)} size="lg" label="JOGAR AGORA" />
              <GhostButton onClick={() => toggleFavorite(game)} active={game.favorite} className="h-14 px-5">
                <Heart className={`size-[18px] ${game.favorite ? 'fill-current' : ''}`} /> {game.favorite ? 'Favorito' : 'Favoritar'}
              </GhostButton>
              <GhostButton onClick={() => window.api.openFolder(game.id)} tip="Abrir pasta de instalação" className="h-14 w-14 px-0">
                <FolderOpen className="size-[19px]" />
              </GhostButton>
            </div>
          </div>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <section className="rise rounded-[22px] border border-line bg-gradient-to-b from-surface to-base px-6 py-2" style={{ animationDelay: '140ms' }}>
            <InfoRow icon={Timer} label="Tempo jogado registrado">
              {game.playtimeSeconds > 0 ? formatPlaytime(game.playtimeSeconds) : 'Não disponível'}
            </InfoRow>
            <InfoRow icon={CalendarClock} label="Última execução">
              {game.lastLaunchedAt ? `${relativeTime(game.lastLaunchedAt)} · ${new Date(game.lastLaunchedAt).toLocaleString('pt-BR')}` : 'Nunca iniciado pelo AFTERPLAYER'}
            </InfoRow>
            <InfoRow icon={Monitor} label="Plataforma">
              {platformLabel[game.platform]}
              {game.appId ? ` · AppID ${game.appId}` : ''}
            </InfoRow>
            <InfoRow icon={HardDrive} label="Diretório de instalação" mono>
              {game.installDir}
            </InfoRow>
            {game.platform === 'local' && (
              <InfoRow icon={FileCog} label="Executável" mono>
                {game.launchPath ?? game.exePath}
              </InfoRow>
            )}
          </section>

          <section className="rise flex flex-col gap-3 self-start rounded-[22px] border border-line bg-gradient-to-b from-surface to-base p-6" style={{ animationDelay: '200ms' }}>
            <h3 className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-muted">Personalizar</h3>
            <GhostButton onClick={() => window.api.openFolder(game.id)} className="h-11 justify-start">
              <FolderOpen className="size-4" /> Localizar arquivos
            </GhostButton>
            <GhostButton onClick={() => changeImage('cover')} className="h-11 justify-start">
              <ImagePlus className="size-4" /> Alterar capa
            </GhostButton>
            <GhostButton onClick={() => changeImage('hero')} className="h-11 justify-start">
              <ImagePlus className="size-4" /> Alterar banner
            </GhostButton>
            {game.platform === 'local' && (
              <GhostButton onClick={changeExe} className="h-11 justify-start">
                <FileCog className="size-4" /> Alterar executável
              </GhostButton>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
