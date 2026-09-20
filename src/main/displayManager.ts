import { screen, type Display } from 'electron'
import type { DesktopBounds } from '../shared/types'

export class DisplayManager {
  primary(): Display {
    return screen.getPrimaryDisplay()
  }

  primaryWorkArea(): DesktopBounds {
    const area = this.primary().workArea
    return { x: area.x, y: area.y, width: area.width, height: area.height }
  }

  allDisplays(): Display[] {
    return screen.getAllDisplays()
  }

  cursorPoint(): { x: number; y: number } {
    return screen.getCursorScreenPoint()
  }

  onChange(callback: () => void): () => void {
    screen.on('display-metrics-changed', callback)
    screen.on('display-added', callback)
    screen.on('display-removed', callback)
    return () => {
      screen.off('display-metrics-changed', callback)
      screen.off('display-added', callback)
      screen.off('display-removed', callback)
    }
  }
}
