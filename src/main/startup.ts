import { app } from 'electron'

export function applyLoginItem(openAtLogin: boolean): void {
  if (process.platform === 'linux') return
  app.setLoginItemSettings({ openAtLogin, openAsHidden: true })
}
