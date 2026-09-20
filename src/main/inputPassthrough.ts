import type { BrowserWindow } from 'electron'

export function enableClickThrough(window: BrowserWindow): void {
  // Hover is supplied by OS cursor polling. Forwarding installs a separate
  // native mouse hook on Windows that we do not need to keep across sleep.
  window.setIgnoreMouseEvents(true)
}

export function disableClickThrough(window: BrowserWindow): void {
  window.setIgnoreMouseEvents(false)
}
