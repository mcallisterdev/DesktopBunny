import type { RandomSource } from '@shared/Random'
import type { FoodItem } from '../food/FoodItem'
import type { ScreenBounds } from '../movement/screenBounds'
import type { Pet, PetId } from '../pets/Pet'

export interface WorldContext {
  pets: Pet[]
  food: FoodItem[]
  bounds: ScreenBounds
  random: RandomSource
  pointer: { x: number; y: number }
  timeMs: number
}

export function findPet(ctx: WorldContext, id: PetId | undefined): Pet | undefined {
  if (!id) return undefined
  return ctx.pets.find((pet) => pet.id === id)
}

export function otherPets(pet: Pet, ctx: WorldContext): Pet[] {
  return ctx.pets.filter((candidate) => candidate.id !== pet.id)
}
