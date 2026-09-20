import { describe, expect, it } from 'vitest'
import { tacoPersonality, tacoProfile } from '@config/taco'
import { pointInHitbox } from '@renderer/input/hitTesting'
import {
  PointerInteractionController,
  type PointerSnapshot
} from '@renderer/input/PointerInteractionController'
import { createScreenBounds } from '@renderer/movement/screenBounds'
import { createPet, type Pet } from '@renderer/pets/Pet'

const bounds = createScreenBounds({ x: 0, y: 0, width: 1200, height: 700 }, 28)

function setup() {
  const pets: Pet[] = [
    createPet('taco', tacoProfile, tacoPersonality, { x: 400, y: bounds.floorY })
  ]
  const hitTest = (petId: string, x: number, y: number): boolean => {
    const pet = pets.find((candidate) => candidate.id === petId)
    return pet ? pointInHitbox(pet, x, y) : false
  }
  const controller = new PointerInteractionController(hitTest)
  return { pets, pet: pets[0], controller }
}

function pointer(x: number, y: number, down = false): PointerSnapshot {
  return { x, y, down }
}

const HOVER_X = 400
const HOVER_Y = bounds.floorY - 40

describe('pointer interactions', () => {
  it('captures the pointer while hovering a pet and releases when it leaves', () => {
    const { pets, controller } = setup()

    let state = controller.update(pets, pointer(HOVER_X, HOVER_Y), bounds, 16)
    expect(state.hovering).toBe(true)
    expect(state.capturing).toBe(true)
    expect(pets[0].pointer.hovered).toBe(true)

    state = controller.update(pets, pointer(1000, 100), bounds, 16)
    expect(state.hovering).toBe(false)
    expect(state.capturing).toBe(false)
    expect(pets[0].pointer.hovered).toBe(false)
  })

  it('turns to look towards the pointer when hovering', () => {
    const { pets, controller } = setup()

    controller.update(pets, pointer(HOVER_X + 60, HOVER_Y), bounds, 16)
    expect(pets[0].facing).toBe('right')

    controller.update(pets, pointer(HOVER_X - 60, HOVER_Y), bounds, 16)
    expect(pets[0].facing).toBe('left')
  })

  it('keeps the pointer captured while a press is in flight even if the pet moves away', () => {
    const { pets, pet, controller } = setup()

    controller.update(pets, pointer(HOVER_X, HOVER_Y), bounds, 16)
    controller.update(pets, pointer(HOVER_X, HOVER_Y, true), bounds, 16)

    pet.position.x = 1000
    const state = controller.update(pets, pointer(HOVER_X, HOVER_Y, true), bounds, 16)
    expect(state.hovering).toBe(false)
    expect(state.dragging).toBe(false)
    expect(state.capturing).toBe(true)
  })

  it('flags a quick press and release as a click reaction', () => {
    const { pets, controller } = setup()

    controller.update(pets, pointer(HOVER_X, HOVER_Y), bounds, 16)
    controller.update(pets, pointer(HOVER_X, HOVER_Y, true), bounds, 16)
    controller.update(pets, pointer(HOVER_X, HOVER_Y), bounds, 16)

    expect(pets[0].pointer.clicked).toBe(true)
    expect(pets[0].pointer.dragging).toBe(false)
  })

  it('drags a pet once the pointer moves past the threshold', () => {
    const { pets, controller } = setup()
    const pet = pets[0]

    controller.update(pets, pointer(HOVER_X, HOVER_Y), bounds, 16)
    controller.update(pets, pointer(HOVER_X, HOVER_Y, true), bounds, 16)
    let state = controller.update(pets, pointer(HOVER_X + 30, HOVER_Y, true), bounds, 16)

    expect(pet.pointer.dragging).toBe(true)
    expect(state.capturing).toBe(true)
    expect(pet.state).not.toBe('dragged')

    state = controller.update(pets, pointer(HOVER_X + 120, HOVER_Y, true), bounds, 16)
    expect(state.dragging).toBe(true)
    expect(pet.position.x).toBeCloseTo(HOVER_X + 120, 5)

    controller.update(pets, pointer(HOVER_X + 120, HOVER_Y), bounds, 16)
    expect(pet.pointer.dragging).toBe(false)
  })

  it('triggers petting after the pointer strokes across the pet', () => {
    const { pets, controller } = setup()

    for (let i = 0; i < 6; i += 1) {
      const x = i % 2 === 0 ? HOVER_X - 50 : HOVER_X + 50
      controller.update(pets, pointer(x, HOVER_Y), bounds, 16)
    }

    expect(pets[0].pointer.petting).toBe(true)
  })

  it('re-arms capture and clears a stale drag after a reset', () => {
    const { pets, controller } = setup()

    controller.update(pets, pointer(HOVER_X, HOVER_Y), bounds, 16)
    controller.update(pets, pointer(HOVER_X, HOVER_Y, true), bounds, 16)
    controller.update(pets, pointer(HOVER_X + 30, HOVER_Y, true), bounds, 16)
    expect(pets[0].pointer.dragging).toBe(true)

    controller.reset(pets)
    expect(pets[0].pointer.dragging).toBe(false)

    const state = controller.update(pets, pointer(HOVER_X, HOVER_Y, false), bounds, 16)
    expect(state.capturing).toBe(true)
    expect(state.hovering).toBe(true)
    expect(pets[0].pointer.dragging).toBe(false)

    controller.update(pets, pointer(HOVER_X, HOVER_Y, true), bounds, 16)
    const resumed = controller.update(pets, pointer(HOVER_X + 30, HOVER_Y, true), bounds, 16)
    expect(resumed.dragging).toBe(true)
  })
})
