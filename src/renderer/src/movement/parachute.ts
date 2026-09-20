import { clamp } from '@shared/Vector2'
import type { Pet } from '../pets/Pet'
import type { ScreenBounds } from './screenBounds'

/** A drop only earns a parachute once it clears two body heights. */
export const PARACHUTE_TRIGGER_BODY_HEIGHTS = 2
export const PARACHUTE_SPEED_PX_PER_SEC = 74
export const PARACHUTE_SWAY_AMPLITUDE_PX = 8
export const PARACHUTE_SWAY_PERIOD_MS = 2300

export function parachuteThreshold(pet: Pet): number {
  return pet.profile.hitboxHeight * PARACHUTE_TRIGGER_BODY_HEIGHTS
}

export function shouldDeployParachute(pet: Pet, bounds: ScreenBounds): boolean {
  return bounds.floorY - pet.position.y >= parachuteThreshold(pet)
}

/** Eases the bunny back to the floor, drifting gently side to side. Returns true once landed. */
export function updateParachute(pet: Pet, bounds: ScreenBounds, deltaMs: number): boolean {
  pet.position.y = Math.min(
    bounds.floorY,
    pet.position.y + (PARACHUTE_SPEED_PX_PER_SEC * deltaMs) / 1000
  )

  const phase = (pet.stateElapsedMs / PARACHUTE_SWAY_PERIOD_MS) * Math.PI * 2
  const sway = Math.sin(phase) * PARACHUTE_SWAY_AMPLITUDE_PX
  const half = pet.profile.hitboxWidth / 2
  pet.position.x = clamp(pet.stateStartPosition.x + sway, bounds.left + half, bounds.right - half)

  return pet.position.y >= bounds.floorY
}
