import { BrowserWindow, type WebContents } from 'electron'
import { join } from 'node:path'
import type { DisplayManager } from './displayManager'
import { disableClickThrough, enableClickThrough } from './inputPassthrough'
import type { SettingsStore } from './settingsStore'

export class WindowManager {
  private window: BrowserWindow | null = null
  private replacement: BrowserWindow | null = null
  private recoveryTimer: NodeJS.Timeout | null = null
  private recoveryNeeded = true
  private capturingPointer = false
  private pointerTimer: NodeJS.Timeout | null = null
  private lastPointerX = Number.NaN
  private lastPointerY = Number.NaN

  constructor(
    private readonly settings: SettingsStore,
    private readonly displays: DisplayManager
  ) {}

  create(): BrowserWindow {
    const window = this.createWindow()
    this.window = window
    this.startPointerPolling()
    return window
  }

  private createWindow(): BrowserWindow {
    const area = this.displays.primaryWorkArea()

    const window = new BrowserWindow({
      x: area.x,
      y: area.y,
      width: area.width,
      height: area.height,
      transparent: true,
      frame: false,
      resizable: false,
      movable: false,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      hasShadow: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      focusable: false,
      show: false,
      backgroundColor: '#00000000',
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
        backgroundThrottling: false
      }
    })

    window.setMenu(null)
    window.setAlwaysOnTop(true, 'screen-saver')
    window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
    enableClickThrough(window)

    window.webContents.on('did-finish-load', () => {
      window.webContents.send('settings:update', this.settings.get())
    })

    if (process.env.ELECTRON_RENDERER_URL) {
      void window.loadURL(process.env.ELECTRON_RENDERER_URL)
    } else {
      void window.loadFile(join(__dirname, '../renderer/index.html'))
    }

    window.on('closed', () => {
      if (this.replacement === window) this.cancelReplacement()
      // The retired window closes after its replacement becomes current.
      if (this.window === window) {
        this.window = null
        this.stopPointerPolling()
      }
    })

    return window
  }

  rendererReady(sender: WebContents): void {
    if (this.replacement?.webContents === sender) {
      const previous = this.window
      this.window = this.replacement
      this.replacement = null
      this.clearRecoveryTimer()
      this.recoveryNeeded = false
      this.capturingPointer = false
      this.lastPointerX = Number.NaN
      this.lastPointerY = Number.NaN
      this.window.webContents.send('power:resume')
      this.applySettings()
      this.pollPointer()
      // Only destroy the old native surface once the new renderer is ready.
      if (previous && !previous.isDestroyed()) previous.destroy()
    } else if (this.window?.webContents === sender) {
      this.applySettings()
      this.pollPointer()
    }
  }

  private clearRecoveryTimer(): void {
    if (this.recoveryTimer) clearTimeout(this.recoveryTimer)
    this.recoveryTimer = null
  }

  private cancelReplacement(): void {
    const replacement = this.replacement
    this.replacement = null
    this.clearRecoveryTimer()
    if (replacement && !replacement.isDestroyed()) replacement.destroy()
  }

  // Poll the OS cursor for hover while the window passes native mouse events
  // through. This avoids Electron's separate forwarded mouse-event hook.
  private startPointerPolling(): void {
    if (this.pointerTimer) return
    this.pointerTimer = setInterval(() => this.pollPointer(), 33)
  }

  private stopPointerPolling(): void {
    if (!this.pointerTimer) return
    clearInterval(this.pointerTimer)
    this.pointerTimer = null
  }

  private pollPointer(): void {
    const window = this.window
    if (!window || window.isDestroyed()) {
      this.stopPointerPolling()
      return
    }
    if (!window.isVisible()) return

    const cursor = this.displays.cursorPoint()
    const bounds = window.getBounds()
    const x = cursor.x - bounds.x
    const y = cursor.y - bounds.y
    if (x === this.lastPointerX && y === this.lastPointerY) return
    this.lastPointerX = x
    this.lastPointerY = y
    window.webContents.send('pointer:poll', { x, y })
  }

  applySettings(): void {
    const window = this.window
    if (!window || window.isDestroyed()) return

    if (this.settings.get().enabled) {
      window.showInactive()
      this.lastPointerX = Number.NaN
      this.lastPointerY = Number.NaN
      this.startPointerPolling()
    } else {
      window.hide()
    }

    this.sendSettings()
  }

  sendSettings(): void {
    const window = this.window
    if (!window || window.isDestroyed()) return
    window.webContents.send('settings:update', this.settings.get())
  }

  addKale(): void {
    const window = this.window
    if (!window || window.isDestroyed()) return
    window.webContents.send('food:add')
  }

  setPointerCapture(capturing: boolean, sender?: WebContents): void {
    const window = this.window
    if (sender && sender !== window?.webContents) return
    if (!window || window.isDestroyed() || capturing === this.capturingPointer) return
    this.capturingPointer = capturing
    if (capturing) disableClickThrough(window)
    else enableClickThrough(window)
  }

  // Recreate the native surface: toggling click-through on the existing HWND
  // was insufficient to restore mouse buttons after sleep on Windows.
  handleSuspend(): void {
    this.recoveryNeeded = true
    // A replacement started before another sleep/lock is stale as well.
    this.cancelReplacement()
    if (this.window && !this.window.isDestroyed()) this.window.hide()
  }

  handleResume(): void {
    const window = this.window
    if (!window || window.isDestroyed()) return
    // Resume and unlock belong to the same cycle even when minutes apart.
    // Only a new suspend/lock arms another successful replacement.
    if (this.replacement || !this.recoveryNeeded) return
    // Do not briefly reveal the stale bunnies while the fresh renderer loads.
    window.hide()
    this.replacement = this.createWindow()
    // A failed renderer must not leave an invisible replacement around forever.
    this.recoveryTimer = setTimeout(() => {
      console.error('[taco-tanya] Wake recovery renderer did not become ready')
      this.cancelReplacement()
      this.applySettings()
    }, 15000)
  }

  setBoundsToDisplay(): void {
    const window = this.window
    if (!window || window.isDestroyed()) return
    window.setBounds(this.displays.primaryWorkArea())
  }

  getWindow(): BrowserWindow | null {
    return this.window
  }
}
