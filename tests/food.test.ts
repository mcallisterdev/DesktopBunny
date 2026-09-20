import { describe, expect, it } from 'vitest'
import { createSeededRandomSource } from '@shared/Random'
import { tacoPersonality, tacoProfile } from '@config/taco'
import { tanyaPersonality, tanyaProfile } from '@config/tanya'
import { BehaviourController } from '@renderer/behaviour/BehaviourController'
import { getWeightedTransitions } from '@renderer/behaviour/transitions'
import type { WorldContext } from '@renderer/behaviour/WorldContext'
import {
  consumeKaleBite,
  findFood,
  KALE_BITES,
  nearestFood,
  spawnKale,
  type FoodItem
} from '@renderer/food/FoodItem'
import { createScreenBounds } from '@renderer/movement/screenBounds'
import { createPet, type Pet } from '@renderer/pets/Pet'

const bounds = createScreenBounds({ x: 0, y: 0, width: 1200, height: 700 }, 28)

function makePets(): Pet[] {
  return [
    createPet('taco', tacoProfile, tacoPersonality, { x: 300, y: bounds.floorY }),
    createPet('tanya', tanyaProfile, tanyaPersonality, { x: 800, y: bounds.floorY })
  ]
}

describe('food', () => {
  it('spawns kale within the usable floor area', () => {
    const random = createSeededRandomSource(11)
    for (let i = 0; i < 50; i += 1) {
      const food: FoodItem[] = []
      const kale = spawnKale(food, bounds, random)
      expect(kale.position.x).toBeGreaterThanOrEqual(bounds.left + 90)
      expect(kale.position.x).toBeLessThanOrEqual(bounds.right - 90)
      expect(kale.position.y).toBe(bounds.floorY)
      expect(kale.bites).toBe(KALE_BITES)
      expect(food).toHaveLength(1)
    }
  })

  it('removes kale once its last bite is eaten', () => {
    const food: FoodItem[] = []
    const kale = spawnKale(food, bounds, createSeededRandomSource(1))

    for (let i = 0; i < KALE_BITES - 1; i += 1) consumeKaleBite(food, kale.id)
    expect(findFood(food, kale.id)).toBeDefined()

    consumeKaleBite(food, kale.id)
    expect(findFood(food, kale.id)).toBeUndefined()
    expect(food).toHaveLength(0)
  })

  it('picks the nearest kale', () => {
    const food: FoodItem[] = [
      { id: 1, type: 'kale', position: { x: 900, y: bounds.floorY }, bites: 1 },
      { id: 2, type: 'kale', position: { x: 320, y: bounds.floorY }, bites: 1 }
    ]
    const [pet] = makePets()
    expect(nearestFood(pet, food)?.id).toBe(2)
  })

  it('makes approaching food a plausible transition when kale is present', () => {
    const pets = makePets()
    const ctx: WorldContext = {
      pets,
      food: [{ id: 1, type: 'kale', position: { x: 500, y: bounds.floorY }, bites: 1 }],
      bounds,
      random: createSeededRandomSource(1),
      pointer: { x: 0, y: 0 },
      timeMs: 0
    }
    const candidate = getWeightedTransitions(pets[0], ctx).find(
      (entry) => entry.state === 'approachFood'
    )
    expect(candidate).toBeDefined()
    expect(candidate!.weight).toBeGreaterThan(0)
  })

  it('sends a rabbit over to eat the kale', () => {
    const pets = makePets()
    const food: FoodItem[] = [
      { id: 1, type: 'kale', position: { x: 520, y: bounds.floorY }, bites: KALE_BITES }
    ]
    const ctx: WorldContext = {
      pets,
      food,
      bounds,
      random: createSeededRandomSource(7),
      pointer: { x: 0, y: 0 },
      timeMs: 0
    }
    const controller = new BehaviourController()
    controller.enter(pets[0], 'idle', ctx)

    let enteredEat = false
    for (let i = 0; i < 6000; i += 1) {
      controller.update(pets[0], ctx, 16)
      if (pets[0].state === 'eat') enteredEat = true
    }

    expect(enteredEat).toBe(true)
    const remaining = food[0]
    expect(remaining === undefined || remaining.bites < KALE_BITES).toBe(true)
  })
})
