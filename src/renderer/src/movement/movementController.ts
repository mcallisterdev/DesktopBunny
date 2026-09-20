import type { RandomSource } from '@shared/Random'
import { lerp } from '@shared/Vector2'
import type { Pet } from '../pets/Pet'
import type { PetState } from '../pets/PetState'
import { motionProfiles } from './motionProfiles'
import { chooseTargetX, type ScreenBounds } from './screenBounds'

export function movementBudget(pet: Pet): number {
  return 120 + pet.personality.restlessness * 280
}

export function startMovement(
  pet: Pet,
  state: PetState,
  bounds: ScreenBounds,
  random: RandomSource,
  targetX?: number
): void {
  const motion = motionProfiles[state]
  pet.stateStartPosition = { x: pet.position.x, y: pet.position.y }

  const resolvedX = targetX ?? chooseTargetX(pet, bounds, random, movementBudget(pet))
  pet.targetPosition = { x: resolvedX, y: bounds.floorY }
  pet.velocity = { x: 0, y: 0 }

  if (motion) {
    const distance = Math.abs(resolvedX - pet.position.x)
    const raw = (distance / motion.speedPxPerSec) * 1000
    pet.stateDurationMs = Math.min(motion.maxDurationMs, Math.max(motion.minDurationMs, raw))
  } else {
    pet.stateDurationMs = 0
  }

  pet.stateElapsedMs = 0
  updateFacing(pet)
}

export function updateMovement(pet: Pet): boolean {
  if (!pet.targetPosition) return true

  const motion = motionProfiles[pet.state]
  const duration = pet.stateDurationMs && pet.stateDurationMs > 0 ? pet.stateDurationMs : 1
  const t = Math.min(1, pet.stateElapsedMs / duration)
  const eased = motion ? motion.ease(t) : t

  pet.position.x = lerp(pet.stateStartPosition.x, pet.targetPosition.x, eased)
  updateFacing(pet)

  return t >= 1
}

export function updateFacing(pet: Pet): void {
  const targetX = pet.targetPosition?.x
  if (targetX === undefined) return
  if (targetX > pet.position.x + 1) pet.facing = 'right'
  else if (targetX < pet.position.x - 1) pet.facing = 'left'
}
