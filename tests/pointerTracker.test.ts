import { describe, expect, it } from 'vitest'
import { PointerTracker } from '@renderer/input/pointerTracker'

function pointerEvent(type: string, props: Record<string, unknown>): Event {
  const event = new Event(type)
  Object.assign(event, props)
  return event
}

describe('PointerTracker', () => {
  it('clears a stuck press when a subsequent move reports no buttons', () => {
    const target = new EventTarget()
    const tracker = new PointerTracker()
    const detach = tracker.attach(target as unknown as Window)

    target.dispatchEvent(
      pointerEvent('pointerdown', { button: 0, buttons: 1, clientX: 10, clientY: 20 })
    )
    expect(tracker.down).toBe(true)

    // A swallowed pointerup followed by a normal move should self-heal.
    target.dispatchEvent(pointerEvent('pointermove', { buttons: 0, clientX: 30, clientY: 40 }))
    expect(tracker.down).toBe(false)
    expect(tracker.position).toEqual({ x: 30, y: 40 })

    detach()
  })

  it('keeps the press while a move still reports the primary button', () => {
    const target = new EventTarget()
    const tracker = new PointerTracker()
    const detach = tracker.attach(target as unknown as Window)

    target.dispatchEvent(
      pointerEvent('pointerdown', { button: 0, buttons: 1, clientX: 10, clientY: 20 })
    )
    target.dispatchEvent(pointerEvent('pointermove', { buttons: 1, clientX: 15, clientY: 25 }))
    expect(tracker.down).toBe(true)

    detach()
  })

  it('clears the press on pointercancel', () => {
    const target = new EventTarget()
    const tracker = new PointerTracker()
    const detach = tracker.attach(target as unknown as Window)

    target.dispatchEvent(
      pointerEvent('pointerdown', { button: 0, buttons: 1, clientX: 10, clientY: 20 })
    )
    target.dispatchEvent(pointerEvent('pointercancel', {}))
    expect(tracker.down).toBe(false)

    detach()
  })

  it('clears a held press on reset', () => {
    const target = new EventTarget()
    const tracker = new PointerTracker()
    const detach = tracker.attach(target as unknown as Window)

    target.dispatchEvent(
      pointerEvent('pointerdown', { button: 0, buttons: 1, clientX: 10, clientY: 20 })
    )
    expect(tracker.down).toBe(true)

    tracker.reset()
    expect(tracker.down).toBe(false)

    detach()
  })

  it('accepts a polled position without pointer events', () => {
    const tracker = new PointerTracker()

    tracker.setPosition(123, 456)
    expect(tracker.position).toEqual({ x: 123, y: 456 })
    expect(tracker.down).toBe(false)
  })
})
