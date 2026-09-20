import { weightedPick, type RandomSource } from '@shared/Random'
import type { PetState } from '../pets/PetState'

export interface TransitionCandidate {
  state: PetState
  weight: number
}

export function pickTransition(
  random: RandomSource,
  candidates: TransitionCandidate[]
): TransitionCandidate | undefined {
  return weightedPick<TransitionCandidate>(
    random,
    candidates.map((candidate) => ({ item: candidate, weight: candidate.weight }))
  )
}
