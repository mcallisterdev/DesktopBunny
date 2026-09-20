import { describe, expect, it } from 'vitest'
import { createSeededRandomSource } from '@shared/Random'
import { tacoPersonality, tacoProfile } from '@config/taco'
import { createScreenBounds } from '@renderer/movement/screenBounds'
import { startMovement, updateMovement } from '@renderer/movement/movementController'
import { createPet } from '@renderer/pets/Pet'

const bounds = createScreenBounds({ x: 0, y: 0, width: 1000, height: 600 }, 28)

function makePet() {
  return createPet('taco', tacoProfile, tacoPersonality, { x: 200, y: bounds.floorY })
}

describe('movementController', () => {
  it('keeps hop targets inside the screen bounds', () => {
    const random = createSeededRandomSource(42)
    for (let i = 0; i < 100; i += 1) {
      const pet = makePet()
      startMovement(pet, 'hop', bounds, random)
      expect(pet.targetPosition).toBeDefined()
      expect(pet.targetPosition!.x).toBeGreaterThanOrEqual(tacoProfile.hitboxWidth / 2)
      expect(pet.targetPosition!.x).toBeLessThanOrEqual(bounds.right - tacoProfile.hitboxWidth / 2)
    }
  })

  it('arrives at the chosen target', () => {
    const pet = makePet()
    startMovement(pet, 'hop', bounds, createSeededRandomSource(7))

    let arrived = false
    for (let i = 0; i < 600 && !arrived; i += 1) {
      pet.stateElapsedMs += 16
      arrived = updateMovement(pet)
    }

    expect(arrived).toBe(true)
    expect(pet.position.x).toBeCloseTo(pet.targetPosition!.x, 1)
  })

  it('faces the direction of travel', () => {
    const pet = makePet()
    pet.position.x = 100
    startMovement(pet, 'hop', bounds, createSeededRandomSource(3), 800)
    expect(pet.facing).toBe('right')
  })
})
