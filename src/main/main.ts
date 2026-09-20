import { app, powerMonitor } from 'electron'
import { DisplayManager } from './displayManager'
import { registerIpc } from './ipc'
import { SettingsStore } from './settingsStore'
import { applyLoginItem } from './startup'
import { createTray } from './tray'
import { WindowManager } from './windowManager'

const gotSingleInstanceLock = app.requestSingleInstanceLock()

if (!gotSingleInstanceLock) {
  app.quit()
} else {
  const settings = new SettingsStore()
  let windows: WindowManager | null = null
  let displays: DisplayManager | null = null

  app.whenReady().then(async () => {
    await settings.load()
    applyLoginItem(settings.get().launchAtLogin)

    displays = new DisplayManager()
    windows = new WindowManager(settings, displays)
    windows.create()

    registerIpc(windows)
    createTray(settings, windows)

    displays.onChange(() => windows?.setBoundsToDisplay())

    const recoverFromResume = (): void => windows?.handleResume()
    const prepareForResume = (): void => windows?.handleSuspend()
    powerMonitor.on('suspend', prepareForResume)
    powerMonitor.on('lock-screen', prepareForResume)
    powerMonitor.on('resume', recoverFromResume)
    powerMonitor.on('unlock-screen', recoverFromResume)
  })

  app.on('second-instance', () => windows?.applySettings())

  app.on('activate', () => windows?.applySettings())

  app.on('window-all-closed', () => {
    windows?.applySettings()
  })
}
