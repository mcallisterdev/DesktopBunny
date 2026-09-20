import { ipcMain } from 'electron'
import type { WindowManager } from './windowManager'

export function registerIpc(windows: WindowManager): void {
  ipcMain.on('renderer:ready', (event) => windows.rendererReady(event.sender))
  ipcMain.on('renderer:log', (_event, message: string) => {
    console.log('[taco-tanya]', message)
  })
  ipcMain.on('input:capture', (event, capturing: boolean) => {
    windows.setPointerCapture(capturing, event.sender)
  })
}
