import { contextBridge, ipcRenderer } from 'electron'
import type { Api, ScanProgress } from '../shared/types'

const api: Api = {
  getLibrary: () => ipcRenderer.invoke('library:get'),
  scan: () => ipcRenderer.invoke('library:scan'),
  onScanProgress: (cb) => {
    const listener = (_e: unknown, p: ScanProgress): void => cb(p)
    ipcRenderer.on('scan:progress', listener)
    return () => ipcRenderer.removeListener('scan:progress', listener)
  },
  launch: (id) => ipcRenderer.invoke('game:launch', id),
  openFolder: (id) => ipcRenderer.invoke('game:openFolder', id),
  getImage: (id, kind) => ipcRenderer.invoke('game:image', id, kind),
  getIcon: (id) => ipcRenderer.invoke('game:icon', id),
  chooseImage: (id, kind) => ipcRenderer.invoke('game:chooseImage', id, kind),
  chooseExe: (id) => ipcRenderer.invoke('game:chooseExe', id),
  setFavorite: (id, favorite) => ipcRenderer.invoke('game:setFavorite', id, favorite),
  getInfo: () => ipcRenderer.invoke('library:info')
}

contextBridge.exposeInMainWorld('api', api)
