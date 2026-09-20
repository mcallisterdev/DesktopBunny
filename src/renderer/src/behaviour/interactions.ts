import { randomRange, type RandomSource } from '@shared/Random'
import { clamp } from '@shared/Vector2'
import type { ScreenBounds } from '../movement/screenBounds'
import type { Pet } from '../pets/Pet'

export const TOGETHER_DISTANCE = 150

export function nearestOther(pet: Pet, pets: Pet[]): Pet | undefined {
  return pets
    .filter((candidate) => candidate.id !== pet.id)
    .sort(
      (a, b) =>
        Math.abs(a.position.x - pet.position.x) - Math.abs(b.position.x - pet.position.x)
    )[0]
}

export function approachTargetX(
  approach: Pet,
  target: Pet,
  bounds: ScreenBounds,
  random: RandomSource
): number {
  const half = approach.profile.hitboxWidth / 2
  const side = approach.position.x <= target.position.x ? -1 : 1
  const offset = randomRange(random, 70, 110)
  return clamp(target.position.x + side * offset, bounds.left + half, bounds.right - half)
}

export function areTogether(a: Pet, b: Pet): boolean {
  return Math.abs(a.position.x - b.position.x) <= TOGETHER_DISTANCE
}

export function isSettled(pet: Pet): boolean {
  return (
    pet.state === 'idle' ||
    pet.state === 'sit' ||
    pet.state === 'lookAround' ||
    pet.state === 'groom'
  )
}

export function distanceX(a: Pet, b: Pet): number {
  return Math.abs(a.position.x - b.position.x)
}
