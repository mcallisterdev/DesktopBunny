import { EventEmitter } from 'node:events'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BrowserWindow } from 'electron'
import { WindowManager } from '../src/main/windowManager'
import type { SettingsStore } from '../src/main/settingsStore'
import type { DisplayManager } from '../src/main/displayManager'

const { instances } = vi.hoisted(() => ({ instances: [] as BrowserWindow[] }))

vi.mock('electron', () => ({
  BrowserWindow: class extends EventEmitter {
    visible = false
    destroyed = false
    bounds = { x: 100, y: 50, width: 1200, height: 700 }
    constructor() {
      super()
      instances.push(this as unknown as BrowserWindow)
    }
    webContents = { on: vi.fn(), send: vi.fn() }
    setMenu = vi.fn()
    setAlwaysOnTop = vi.fn()
    setVisibleOnAllWorkspaces = vi.fn()
    setIgnoreMouseEvents = vi.fn()
    loadFile = vi.fn()
    loadURL = vi.fn()
    isDestroyed = () => this.destroyed
    isVisible = () => this.visible
    getBounds = () => this.bounds
    setBounds = vi.fn((bounds) => { this.bounds = bounds })
    hide = vi.fn(() => { this.visible = false })
    showInactive = vi.fn(() => { this.visible = true })
    destroy = vi.fn(() => {
      this.destroyed = true
      this.visible = false
      this.emit('closed')
    })
  }
}))

function setup(enabled = true) {
  const settings = { get: () => ({ enabled }) } as SettingsStore
  const displays = {
    primaryWorkArea: () => ({ x: 100, y: 50, width: 1200, height: 700 }),
    cursorPoint: () => ({ x: 500, y: 650 })
  } as DisplayManager
  const manager = new WindowManager(settings, displays)
  const window = manager.create()
  manager.rendererReady(window.webContents)
  return { manager, window }
}

describe('window wake recovery', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    instances.length = 0
  })
  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('replaces the native window only when its new renderer is ready', () => {
    const { manager, window } = setup()
    manager.setPointerCapture(true, window.webContents)
    manager.handleResume()
    const replacement = instances[1]
    expect(replacement).toBeDefined()
    expect(window.isVisible()).toBe(false)
    expect(window.isDestroyed()).toBe(false)
    expect(replacement.isVisible()).toBe(false)

    manager.rendererReady(replacement.webContents)
    expect(manager.getWindow()).toBe(replacement)
    expect(window.isDestroyed()).toBe(true)
    expect(replacement.isVisible()).toBe(true)
    expect(replacement.webContents.send).toHaveBeenCalledWith('power:resume')
    expect(replacement.webContents.send).toHaveBeenCalledWith('pointer:poll', { x: 400, y: 600 })
    manager.setPointerCapture(true, replacement.webContents)
    expect(replacement.setIgnoreMouseEvents).toHaveBeenLastCalledWith(false)
    // Delayed messages from the old renderer must not undo new capture.
    manager.setPointerCapture(false, window.webContents)
    expect(replacement.setIgnoreMouseEvents).toHaveBeenLastCalledWith(false)
    manager.rendererReady(window.webContents)
    expect(manager.getWindow()).toBe(replacement)
    expect(vi.getTimerCount()).toBe(1)
    vi.advanceTimersByTime(33)
    expect(vi.getTimerCount()).toBe(1)
  })

  it('coalesces delayed resume/unlock until another sleep or lock cycle', () => {
    const { manager } = setup()
    manager.handleSuspend()
    manager.handleResume()
    manager.handleResume()
    expect(instances).toHaveLength(2)
    manager.rendererReady(instances[1].webContents)
    manager.handleResume()
    expect(instances).toHaveLength(2)
    vi.advanceTimersByTime(60000)
    manager.handleResume()
    expect(instances).toHaveLength(2)
    manager.handleSuspend()
    expect(instances[1].isVisible()).toBe(false)
    manager.handleResume()
    expect(instances).toHaveLength(3)
    manager.rendererReady(instances[2].webContents)
    expect(manager.getWindow()).toBe(instances[2])
    expect(instances[1].isDestroyed()).toBe(true)
  })

  it('does not show stale bunnies while the replacement is loading', () => {
    const { manager, window } = setup()
    vi.mocked(window.showInactive).mockClear()
    manager.handleSuspend()
    manager.handleSuspend()
    manager.handleResume()
    vi.advanceTimersByTime(3000)
    manager.handleResume()
    expect(window.showInactive).not.toHaveBeenCalled()
    expect(instances).toHaveLength(2)
    expect(instances[1].isVisible()).toBe(false)
    manager.rendererReady(instances[1].webContents)
    expect(instances[1].showInactive).toHaveBeenCalledTimes(1)
  })

  it('discards an unfinished replacement if the computer sleeps again', () => {
    const { manager } = setup()
    manager.handleResume()
    const interrupted = instances[1]
    manager.handleSuspend()
    expect(interrupted.isDestroyed()).toBe(true)
    manager.rendererReady(interrupted.webContents)
    manager.handleResume()
    manager.rendererReady(instances[2].webContents)
    expect(manager.getWindow()).toBe(instances[2])
    expect(instances[2].isVisible()).toBe(true)
  })

  it('keeps disabled pets hidden on resume', () => {
    const { manager, window } = setup(false)
    manager.handleResume()
    const replacement = instances[1]
    manager.rendererReady(replacement.webContents)
    expect(window.showInactive).not.toHaveBeenCalled()
    expect(replacement.showInactive).not.toHaveBeenCalled()
    expect(replacement.webContents.send).not.toHaveBeenCalledWith('pointer:poll', expect.anything())
  })

  it('retains the old window if replacement startup fails and allows a retry', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { manager, window } = setup()
    manager.handleResume()
    vi.advanceTimersByTime(15000)
    expect(instances[1].isDestroyed()).toBe(true)
    expect(manager.getWindow()).toBe(window)
    expect(window.isVisible()).toBe(true)
    manager.handleResume()
    expect(instances).toHaveLength(3)
    error.mockRestore()
  })

  it('does not install mouse forwarding alongside cursor polling', () => {
    const { manager, window } = setup()
    manager.setPointerCapture(true, window.webContents)
    manager.setPointerCapture(false, window.webContents)
    manager.handleResume()
    for (const instance of instances) {
      for (const args of vi.mocked(instance.setIgnoreMouseEvents).mock.calls) {
        expect(args).toHaveLength(1)
      }
    }
  })
})
