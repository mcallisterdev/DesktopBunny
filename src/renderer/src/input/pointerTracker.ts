export interface PointerPosition {
  x: number
  y: number
}

export class PointerTracker {
  readonly position: PointerPosition = { x: 0, y: 0 }
  down = false

  reset(): void {
    this.down = false
  }

  setPosition(x: number, y: number): void {
    this.position.x = x
    this.position.y = y
  }

  attach(target: Window = window): () => void {
    const onMove = (event: PointerEvent): void => {
      this.position.x = event.clientX
      this.position.y = event.clientY
      // Self-heal: if a pointerup was swallowed (e.g. released while the window
      // was click-through), the next move still reports the real button state.
      if ((event.buttons & 1) === 0) this.down = false
    }
    const onDown = (event: PointerEvent): void => {
      if (event.button !== 0) return
      this.down = true
      this.position.x = event.clientX
      this.position.y = event.clientY
    }
    const onUp = (event: PointerEvent): void => {
      if (event.button !== 0) return
      this.down = false
    }
    const onCancel = (): void => {
      this.down = false
    }

    target.addEventListener('pointermove', onMove)
    target.addEventListener('pointerdown', onDown)
    target.addEventListener('pointerup', onUp)
    target.addEventListener('pointercancel', onCancel)
    target.addEventListener('blur', onCancel)

    return () => {
      target.removeEventListener('pointermove', onMove)
      target.removeEventListener('pointerdown', onDown)
      target.removeEventListener('pointerup', onUp)
      target.removeEventListener('pointercancel', onCancel)
      target.removeEventListener('blur', onCancel)
    }
  }
}
