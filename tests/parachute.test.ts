import { describe, expect, it } from 'vitest'
import { createSeededRandomSource } from '@shared/Random'
import { tacoPersonality, tacoProfile } from '@config/taco'
import { BehaviourController } from '@renderer/behaviour/BehaviourController'
import type { WorldContext } from '@renderer/behaviour/WorldContext'
import { createScreenBounds } from '@renderer/movement/screenBounds'
import { parachuteThreshold, shouldDeployParachute } from '@renderer/movement/parachute'
import { createPet, type Pet } from '@renderer/pets/Pet'

const bounds = createScreenBounds({ x: 0, y: 0, width: 1200, height: 900 }, 28)

function setup() {
  const pets: Pet[] = [
    createPet('taco', tacoProfile, tacoPersonality, { x: 400, y: bounds.floorY })
  ]
  const controller = new BehaviourController()
  const ctx: WorldContext = {
    pets,
    food: [],
    bounds,
    random: createSeededRandomSource(7),
    pointer: { x: 0, y: 0 },
    timeMs: 0
  }
  controller.enter(pets[0], 'idle', ctx)
  return { pets, pet: pets[0], controller, ctx }
}

describe('parachute', () => {
  it('only triggers once a drop clears two body heights', () => {
    const { pet } = setup()
    const threshold = parachuteThreshold(pet)

    expect(shouldDeployParachute(pet, bounds)).toBe(false)

    pet.position.y = bounds.floorY - threshold + 1
    expect(shouldDeployParachute(pet, bounds)).toBe(false)

    pet.position.y = bounds.floorY - threshold
    expect(shouldDeployParachute(pet, bounds)).toBe(true)
  })

  it('drifts down after a high drop and lands on the floor', () => {
    const { pet, controller, ctx } = setup()

    pet.pointer.dragging = true
    controller.update(pet, ctx, 16)
    expect(pet.state).toBe('dragged')

    pet.pointer.dragging = false
    pet.position.y = bounds.floorY - parachuteThreshold(pet) - 40
    controller.update(pet, ctx, 16)
    expect(pet.state).toBe('parachute')

    let steps = 0
    while (pet.state === 'parachute' && steps < 4000) {
      controller.update(pet, ctx, 16)
      steps += 1
    }

    expect(pet.state).not.toBe('parachute')
    expect(pet.position.y).toBeCloseTo(bounds.floorY, 5)
  })

  it('lands immediately when the drop is too short for a parachute', () => {
    const { pet, controller, ctx } = setup()

    pet.pointer.dragging = true
    controller.update(pet, ctx, 16)

    pet.pointer.dragging = false
    pet.position.y = bounds.floorY - 40
    controller.update(pet, ctx, 16)

    expect(pet.state).toBe('idle')
    expect(pet.position.y).toBe(bounds.floorY)
  })
})
