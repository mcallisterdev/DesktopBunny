export type PetState =
  | 'idle'
  | 'lookAround'
  | 'hop'
  | 'run'
  | 'sit'
  | 'groom'
  | 'sleep'
  | 'approachOtherRabbit'
  | 'sitWithOtherRabbit'
  | 'pointerReaction'
  | 'petted'
  | 'dragged'
  | 'parachute'
  | 'approachFood'
  | 'eat'

export const MOVING_STATES: ReadonlySet<PetState> = new Set<PetState>([
  'hop',
  'run',
  'approachOtherRabbit',
  'approachFood'
])

export function isMovingState(state: PetState): boolean {
  return MOVING_STATES.has(state)
}

export function isRestingState(state: PetState): boolean {
  return state === 'idle' || state === 'sit' || state === 'sitWithOtherRabbit'
}
