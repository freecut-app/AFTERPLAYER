# AFTERPLAYER

**ALL YOUR GAMES. ONE PLACE.** — launcher de jogos para Windows (Electron + React + TypeScript + Vite + Tailwind).

Logo: `build/icon.svg` (fonte) → `build/icon.png` (ícone da janela/instalador). Componente React: `src/renderer/src/components/Logo.tsx`.
Dados em `%APPDATA%\AFTERPLAYER` (migrados automaticamente de `%APPDATA%\Game Launcher PRO`).

## Download

Baixe o instalador `AFTERPLAYER-Setup-<versão>.exe` em [Releases](https://github.com/freecut-app/AFTERPLAYER/releases).
Ele não é assinado digitalmente: se o Windows SmartScreen avisar, clique em **Mais informações → Executar assim mesmo**.

## Comandos

```bash
npm install          # se o Electron não baixar o binário: node node_modules/electron/install.js
npm run dev          # desenvolvimento com hot reload
npm run build        # compila para ./out
npm start            # roda a versão compilada
npm run typecheck
npm run dist         # gera o instalador release/AFTERPLAYER-Setup-<versão>.exe
```

## O que existe

- **Pasta Games (prioridade)**: `X:\Games` / `X:\Jogos` em cada unidade. Cada subpasta = um jogo; busca recursiva
  (até 4 níveis) ignorando `_Redist`, `__Installer`, desinstaladores, redistribuíveis, crash handlers, anti-cheat e
  utilitários conhecidos (Lossless Scaling, ScriptHook...). Escolhe o executável principal por pasta `<exe>_Data` (Unity),
  semelhança com o nome da pasta e tamanho. Nome: `app.info` do Unity → ProductName do .exe → nome da pasta limpo.
  Nada é executado nem alterado. Inicia via `spawn` sem shell, com a pasta do jogo como diretório de trabalho.
- **Xbox / Microsoft Store**: pastas de instalação do app Xbox (`X:\XboxGames` ou as listadas em `X:\.GamingRoot`).
  Lê `Content\MicrosoftGame.config` (nome, executável, StoreId) e confirma o pacote registrado com `Get-AppxPackage`.
  Inicia pelo Windows (`shell:AppsFolder\<PackageFamilyName>!<AppId>`), igual ao Menu Iniciar. Capa e banner oficiais
  do catálogo público da Microsoft Store. Stubs que só abrem outro app (ex: Minecraft: Java Edition) são ignorados.
- **Detecção Steam**: caminho da Steam pelo Registro (`HKCU\Software\Valve\Steam`) e caminhos padrão;
  bibliotecas via `steamapps/libraryfolders.vdf` / `config/libraryfolders.vdf` e locais conhecidos em cada unidade
  (`X:\SteamLibrary`, `X:\Steam`, ...). Lê `appmanifest_*.acf`; só conta apps com `StateFlags` instalado e pasta existente.
- **Capas/banners**: cache local da Steam (`appcache/librarycache`) ou CDN pública da Steam pelo AppID do manifesto.
  Salvas em `%APPDATA%\AFTERPLAYER\images`. Sem imagem → placeholder.
- **JOGAR**: `steam://rungameid/<AppID>` via `shell.openExternal`.
- **Persistência**: `%APPDATA%\AFTERPLAYER\library.json` (favoritos/última execução são preservados ao re-escanear).
- **Segurança**: `contextIsolation`, `sandbox`, sem `nodeIntegration`; IPC aceita só IDs (`steam:<número>`, `local:<hash>`, `xbox:<hash>`) presentes na biblioteca.

## Estrutura

```
src/main/      processo principal (folders.ts, xbox.ts, steam.ts, vdf.ts, images.ts, store.ts, index.ts)
src/preload/   ponte segura (window.api)
src/renderer/  interface React
src/shared/    tipos compartilhados
```
