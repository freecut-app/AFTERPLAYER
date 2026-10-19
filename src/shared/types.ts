export type Platform = 'steam' | 'local' | 'xbox'
export type ImageKind = 'cover' | 'hero'

export interface Game {
  id: string // ex: "steam:1677740", "local:<hash>" ou "xbox:<hash>"
  platform: Platform
  appId: string | null // Steam
  exePath: string | null // jogos encontrados na pasta Games
  name: string
  installDir: string
  favorite: boolean
  hidden: boolean
  addedAt: number
  lastLaunchedAt: number | null
  /** Segundos de jogo medidos pelo app. 0 enquanto o rastreamento de sessões não existir. */
  playtimeSeconds: number
  /** Jogos locais: AppID da Steam usado só para buscar imagens (nome idêntico na loja). null = sem correspondência. */
  artAppId?: string | null
  /** Jogos locais: executável usado no JOGAR quando diferente do principal (ex: Launcher.exe). */
  launchPath?: string
  /** Xbox: AppUserModelID ("<PackageFamilyName>!<AppId>") usado para iniciar pelo Windows. */
  aumid?: string
  /** Xbox: ID do produto na Microsoft Store, usado só para buscar capa e banner. */
  storeId?: string | null
  /** Imagens escolhidas pelo usuário (nomes de arquivo no cache). */
  images?: Partial<Record<ImageKind, string>>
}

export interface ScanResult {
  games: Game[]
  steamPath: string | null
  libraries: string[]
  gameFolders: string[]
  xboxFolders: string[]
  errors: string[]
}

export interface ScanProgress {
  step: string
  current: number
  total: number
}

export interface Api {
  getLibrary(): Promise<{ games: Game[]; firstRun: boolean }>
  scan(): Promise<ScanResult>
  onScanProgress(cb: (p: ScanProgress) => void): () => void
  launch(id: string): Promise<{ ok: boolean; error?: string }>
  openFolder(id: string): Promise<void>
  /** URL local (glp-img://) da imagem em cache, baixando se necessário; null se indisponível. */
  getImage(id: string, kind: ImageKind): Promise<string | null>
  /** Ícone do executável (data URL) para jogos locais. */
  getIcon(id: string): Promise<string | null>
  /** Abre um seletor de arquivo e define a imagem do jogo. Retorna a nova URL ou null se cancelado. */
  chooseImage(id: string, kind: ImageKind): Promise<string | null>
  /** Jogos locais: escolhe o executável usado no JOGAR. Retorna o caminho ou null se cancelado. */
  chooseExe(id: string): Promise<string | null>
  setFavorite(id: string, favorite: boolean): Promise<Game | null>
  getInfo(): Promise<LibraryInfo>
}

export interface LibraryInfo {
  steamPath: string | null
  gameFolders: string[]
  xboxFolders: string[]
  libraries: string[]
  lastScanAt: number | null
  dataDir: string
}
