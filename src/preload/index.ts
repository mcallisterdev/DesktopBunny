import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import type { PetSettings } from '../config/defaults'

const api = {
  ready: (): void => ipcRenderer.send('renderer:ready'),
  log: (message: string): void => ipcRenderer.send('renderer:log', message),
  setPointerCapturing: (capturing: boolean): void =>
    ipcRenderer.send('input:capture', capturing),
  onSettings: (callback: (settings: PetSettings) => void): (() => void) => {
    const listener = (_event: IpcRendererEvent, settings: PetSettings): void => callback(settings)
    ipcRenderer.on('settings:update', listener)
    return () => ipcRenderer.removeListener('settings:update', listener)
  },
  onAddKale: (callback: () => void): (() => void) => {
    const listener = (): void => callback()
    ipcRenderer.on('food:add', listener)
    return () => ipcRenderer.removeListener('food:add', listener)
  },
  onResume: (callback: () => void): (() => void) => {
    const listener = (): void => callback()
    ipcRenderer.on('power:resume', listener)
    return () => ipcRenderer.removeListener('power:resume', listener)
  },
  onPointerPoll: (
    callback: (position: { x: number; y: number }) => void
  ): (() => void) => {
    const listener = (_event: IpcRendererEvent, position: { x: number; y: number }): void =>
      callback(position)
    ipcRenderer.on('pointer:poll', listener)
    return () => ipcRenderer.removeListener('pointer:poll', listener)
  }
}

contextBridge.exposeInMainWorld('desktopPet', api)

export type DesktopPetApi = typeof api
