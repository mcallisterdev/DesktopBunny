import type { PetState } from '../pets/PetState'

export type Easing = (t: number) => number

export const easeInOutQuad: Easing = (t) =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2

export const easeOutCubic: Easing = (t) => 1 - Math.pow(1 - t, 3)

export interface StateMotion {
  speedPxPerSec: number
  minDurationMs: number
  maxDurationMs: number
  ease: Easing
}

export const motionProfiles: Partial<Record<PetState, StateMotion>> = {
  hop: { speedPxPerSec: 220, minDurationMs: 450, maxDurationMs: 2000, ease: easeInOutQuad },
  run: { speedPxPerSec: 420, minDurationMs: 400, maxDurationMs: 1800, ease: easeOutCubic },
  approachOtherRabbit: {
    speedPxPerSec: 240,
    minDurationMs: 450,
    maxDurationMs: 2600,
    ease: easeInOutQuad
  },
  approachFood: {
    speedPxPerSec: 300,
    minDurationMs: 400,
    maxDurationMs: 2400,
    ease: easeInOutQuad
  }
}
