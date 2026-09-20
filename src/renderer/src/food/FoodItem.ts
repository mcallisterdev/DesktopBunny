import { randomRange, type RandomSource } from '@shared/Random'
import { clamp, type Vector2 } from '@shared/Vector2'
import type { ScreenBounds } from '../movement/screenBounds'
import type { Pet } from '../pets/Pet'

export interface FoodItem {
  id: number
  type: 'kale'
  position: Vector2
  bites: number
}

export const KALE_BITES = 3
export const FOOD_REACH = 75

function nextFoodId(food: FoodItem[]): number {
  return food.reduce((max, item) => Math.max(max, item.id), 0) + 1
}

export function spawnKale(
  food: FoodItem[],
  bounds: ScreenBounds,
  random: RandomSource
): FoodItem {
  const margin = 90
  const x = randomRange(random, bounds.left + margin, bounds.right - margin)
  const item: FoodItem = {
    id: nextFoodId(food),
    type: 'kale',
    position: { x, y: bounds.floorY },
    bites: KALE_BITES
  }
  food.push(item)
  return item
}

export function findFood(food: FoodItem[], id: number | undefined): FoodItem | undefined {
  if (id === undefined) return undefined
  return food.find((item) => item.id === id)
}

export function nearestFood(pet: Pet, food: FoodItem[]): FoodItem | undefined {
  return [...food].sort(
    (a, b) =>
      Math.abs(a.position.x - pet.position.x) - Math.abs(b.position.x - pet.position.x)
  )[0]
}

export function consumeKaleBite(food: FoodItem[], id: number | undefined): void {
  const item = findFood(food, id)
  if (!item) return
  item.bites -= 1
  if (item.bites <= 0) {
    const index = food.indexOf(item)
    if (index >= 0) food.splice(index, 1)
  }
}

export function approachFoodTargetX(
  pet: Pet,
  food: FoodItem,
  bounds: ScreenBounds,
  random: RandomSource
): number {
  const half = pet.profile.hitboxWidth / 2
  const side = pet.position.x <= food.position.x ? -1 : 1
  const offset = randomRange(random, 40, FOOD_REACH - 10)
  return clamp(food.position.x + side * offset, bounds.left + half, bounds.right - half)
}

export function isAtFood(pet: Pet, food: FoodItem): boolean {
  return Math.abs(pet.position.x - food.position.x) <= FOOD_REACH
}
