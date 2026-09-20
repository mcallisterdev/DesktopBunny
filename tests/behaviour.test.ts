import { describe, expect, it } from 'vitest'
import { createSeededRandomSource } from '@shared/Random'
import { tacoPersonality, tacoProfile } from '@config/taco'
import { tanyaPersonality, tanyaProfile } from '@config/tanya'
import { BehaviourController } from '@renderer/behaviour/BehaviourController'
import { getWeightedTransitions } from '@renderer/behaviour/transitions'
import type { WorldContext } from '@renderer/behaviour/WorldContext'
import { createScreenBounds } from '@renderer/movement/screenBounds'
import { createPet, type Pet } from '@renderer/pets/Pet'

const bounds = createScreenBounds({ x: 0, y: 0, width: 1200, height: 700 }, 28)

function makePets(): Pet[] {
  return [
    createPet('taco', tacoProfile, tacoPersonality, { x: 300, y: bounds.floorY }),
    createPet('tanya', tanyaProfile, tanyaPersonality, { x: 800, y: bounds.floorY })
  ]
}

function world(pets: Pet[], seed = 1): WorldContext {
  return {
    pets,
    food: [],
    bounds,
    random: createSeededRandomSource(seed),
    pointer: { x: 0, y: 0 },
    timeMs: 0
  }
}

describe('behaviour', () => {
  it('offers plausible transitions from idle', () => {
    const pets = makePets()
    const candidates = getWeightedTransitions(pets[0], world(pets))
    const states = candidates.map((candidate) => candidate.state)
    expect(states).toContain('hop')
    expect(states).toContain('groom')
    expect(states).toContain('approachOtherRabbit')
    expect(candidates.every((candidate) => candidate.weight >= 0)).toBe(true)
  })

  it('moves through multiple states over time', () => {
    const pets = makePets()
    const controller = new BehaviourController()
    const ctx = world(pets, 99)
    controller.enter(pets[0], 'idle', ctx)

    const seen = new Set<string>()
    for (let i = 0; i < 30000; i += 1) {
      controller.update(pets[0], ctx, 16)
      seen.add(pets[0].state)
    }

    expect(seen.size).toBeGreaterThan(1)
  })

  it('keeps behaviour deterministic with a seeded random source', () => {
    const sequenceFor = (seed: number): string[] => {
      const pets = makePets()
      const controller = new BehaviourController()
      const ctx = world(pets, seed)
      controller.enter(pets[0], 'idle', ctx)
      const states: string[] = []
      for (let i = 0; i < 4000; i += 1) {
        controller.update(pets[0], ctx, 16)
        states.push(pets[0].state)
      }
      return states
    }

    expect(sequenceFor(5)).toEqual(sequenceFor(5))
  })
})
