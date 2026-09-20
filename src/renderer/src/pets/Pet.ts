import type { Vector2 } from '@shared/Vector2'
import type { PetPersonality } from './PetPersonality'
import type { PetPointerState } from './PetPointerState'
import { createPetPointerState } from './PetPointerState'
import type { PetProfile } from './PetProfile'
import type { PetState } from './PetState'

export type PetId = 'taco' | 'tanya'

export interface Pet {
  id: PetId
  profile: PetProfile
  personality: PetPersonality
  state: PetState
  position: Vector2
  velocity: Vector2
  facing: 'left' | 'right'
  stateElapsedMs: number
  stateDurationMs?: number
  targetPosition?: Vector2
  targetPetId?: PetId
  targetFoodId?: number
  avoidPetId?: PetId
  stateStartPosition: Vector2
  decisionElapsedMs: number
  decisionIntervalMs: number
  pointer: PetPointerState
}

export function createPet(
  id: PetId,
  profile: PetProfile,
  personality: PetPersonality,
  position: Vector2
): Pet {
  return {
    id,
    profile,
    personality,
    state: 'idle',
    position: { x: position.x, y: position.y },
    velocity: { x: 0, y: 0 },
    facing: 'right',
    stateElapsedMs: 0,
    stateDurationMs: 0,
    targetPosition: undefined,
    targetPetId: undefined,
    targetFoodId: undefined,
    avoidPetId: undefined,
    stateStartPosition: { x: position.x, y: position.y },
    decisionElapsedMs: 0,
    decisionIntervalMs: 600,
    pointer: createPetPointerState()
  }
}
