import type { Pet } from '../pets/Pet'
import { otherPets, type WorldContext } from './WorldContext'
import type { TransitionCandidate } from './StateMachine'
import { distanceX } from './interactions'

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

export function getWeightedTransitions(pet: Pet, ctx: WorldContext): TransitionCandidate[] {
  const p = pet.personality
  const companion = otherPets(pet, ctx)[0]
  const companionDistance = companion ? distanceX(pet, companion) : Number.POSITIVE_INFINITY
  const nearEdge =
    Math.min(pet.position.x - ctx.bounds.left, ctx.bounds.right - pet.position.x) < 80
  const nearPointer = Math.abs(pet.position.x - ctx.pointer.x) < 160
  const foodAvailable = ctx.food.length > 0
  const foodWeight = foodAvailable ? 2.2 + p.curiosity * 1.6 : 0
  const canSocialise =
    companion !== undefined &&
    companion.state !== 'sleep' &&
    companion.state !== 'sitWithOtherRabbit' &&
    pet.state !== 'sitWithOtherRabbit'

  const socialWeight = canSocialise
    ? p.sociability *
      (0.35 + 0.65 * clamp01(1 - companionDistance / (ctx.bounds.width * 0.6)))
    : 0
  const moveWeight = p.activity * (nearEdge ? 0.6 : 1)

  const list: TransitionCandidate[] = []

  switch (pet.state) {
    case 'idle':
      list.push({ state: 'lookAround', weight: 0.5 + p.curiosity * 1.2 + (nearPointer ? 0.8 : 0) })
      list.push({ state: 'groom', weight: 0.2 + p.groomingFrequency * 1.5 })
      list.push({ state: 'hop', weight: 0.6 + moveWeight * 1.6 })
      list.push({ state: 'binkie', weight: 0.1 + p.binkiness * 0.6 })
      list.push({ state: 'sit', weight: 0.4 + (1 - p.activity) * 0.8 })
      list.push({ state: 'sleep', weight: 0.08 + p.sleepiness * 1.1 })
      list.push({ state: 'approachOtherRabbit', weight: 0.5 + socialWeight * 1.8 })
      list.push({ state: 'approachFood', weight: foodWeight })
      break
    case 'lookAround':
      list.push({ state: 'idle', weight: 1.1 })
      list.push({ state: 'hop', weight: 0.3 + moveWeight })
      list.push({ state: 'binkie', weight: 0.08 + p.binkiness * 0.22 })
      list.push({ state: 'groom', weight: 0.2 + p.groomingFrequency })
      list.push({ state: 'sit', weight: 0.3 + (1 - p.activity) * 0.5 })
      list.push({ state: 'approachFood', weight: foodWeight * 0.8 })
      break
    case 'sit':
      list.push({ state: 'idle', weight: 1 })
      list.push({ state: 'groom', weight: 0.4 + p.groomingFrequency })
      list.push({ state: 'lookAround', weight: 0.4 + p.curiosity })
      list.push({ state: 'sleep', weight: 0.1 + p.sleepiness * 0.8 })
      list.push({ state: 'hop', weight: 0.3 + p.activity * 0.6 })
      list.push({ state: 'binkie', weight: 0.06 + p.binkiness * 0.35 })
      list.push({ state: 'approachFood', weight: foodWeight * 0.7 })
      break
    case 'binkie':
      list.push({ state: 'idle', weight: 1 })
      list.push({ state: 'hop', weight: 0.4 + p.activity * 0.6 })
      break
    case 'groom':
      list.push({ state: 'idle', weight: 1 })
      list.push({ state: 'sit', weight: 0.5 })
      list.push({ state: 'lookAround', weight: 0.5 + p.curiosity })
      list.push({ state: 'approachFood', weight: foodWeight * 0.6 })
      break
    case 'sleep':
      list.push({ state: 'idle', weight: 1 })
      list.push({ state: 'lookAround', weight: 0.3 + p.curiosity * 0.5 })
      break
    case 'sitWithOtherRabbit':
      list.push({ state: 'idle', weight: 0.8 })
      list.push({ state: 'hop', weight: 0.9 + p.restlessness * 1.2 })
      break
    case 'pointerReaction':
      list.push({ state: 'idle', weight: 1.5 })
      list.push({ state: 'lookAround', weight: 0.6 + p.curiosity * 0.5 })
      list.push({ state: 'hop', weight: 0.3 + p.activity * 0.4 })
      break
    case 'petted':
      list.push({ state: 'idle', weight: 1 })
      list.push({ state: 'sit', weight: 0.8 })
      list.push({ state: 'groom', weight: 0.4 + p.groomingFrequency })
      break
    case 'dragged':
      list.push({ state: 'idle', weight: 1 })
      break
    case 'parachute':
      list.push({ state: 'idle', weight: 1 })
      break
    default:
      break
  }

  return list
}
