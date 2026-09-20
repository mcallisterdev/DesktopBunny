import { clamp } from '@shared/Vector2'
import type { ScreenBounds } from '../movement/screenBounds'
import type { Pet, PetId } from '../pets/Pet'
import { isMovingState } from '../pets/PetState'

export interface PointerSnapshot {
  x: number
  y: number
  down: boolean
}

export interface PointerCaptureState {
  capturing: boolean
  hovering: boolean
  dragging: boolean
}

export type PetHitTest = (petId: string, screenX: number, screenY: number) => boolean

const DRAG_START_DISTANCE = 4
const CLICK_MAX_DISTANCE = 6
const CLICK_MAX_DURATION_MS = 350
const PETTING_DISTANCE = 450
const PETTING_DECAY_PER_SEC = 50
const HOVER_LOOK_MARGIN = 10

interface PressState {
  petId: PetId
  startX: number
  startY: number
  offsetX: number
  offsetY: number
  elapsedMs: number
  dragged: boolean
}

function canLookAtPointer(state: Pet['state']): boolean {
  return state !== 'dragged' && state !== 'parachute' && state !== 'sleep' && !isMovingState(state)
}

export class PointerInteractionController {
  private press: PressState | null = null
  private wasDown = false
  private hadPointer = false
  private lastX = 0
  private lastY = 0

  constructor(private readonly hitTest: PetHitTest) {}

  reset(pets: Pet[]): void {
    this.press = null
    this.wasDown = false
    this.hadPointer = false
    for (const pet of pets) {
      pet.pointer.dragging = false
      pet.pointer.hovered = false
      pet.pointer.clicked = false
      pet.pointer.pettingProgress = 0
    }
  }

  update(
    pets: Pet[],
    pointer: PointerSnapshot,
    bounds: ScreenBounds,
    deltaMs: number
  ): PointerCaptureState {
    const travel = this.hadPointer ? Math.hypot(pointer.x - this.lastX, pointer.y - this.lastY) : 0
    this.lastX = pointer.x
    this.lastY = pointer.y
    this.hadPointer = true

    const hoveredPet = pets.find((pet) => this.hitTest(pet.id, pointer.x, pointer.y))
    for (const pet of pets) pet.pointer.hovered = pet === hoveredPet

    if (pointer.down && !this.wasDown && hoveredPet) {
      this.press = {
        petId: hoveredPet.id,
        startX: pointer.x,
        startY: pointer.y,
        offsetX: hoveredPet.position.x - pointer.x,
        offsetY: hoveredPet.position.y - pointer.y,
        elapsedMs: 0,
        dragged: false
      }
    }

    if (this.press && pointer.down) {
      this.press.elapsedMs += deltaMs
      const pressDistance = Math.hypot(
        pointer.x - this.press.startX,
        pointer.y - this.press.startY
      )
      if (!this.press.dragged && pressDistance > DRAG_START_DISTANCE) {
        this.press.dragged = true
        const pet = pets.find((candidate) => candidate.id === this.press?.petId)
        if (pet) {
          pet.pointer.dragging = true
          pet.pointer.dragOffsetX = this.press.offsetX
          pet.pointer.dragOffsetY = this.press.offsetY
          pet.pointer.pettingProgress = 0
        }
      }
    }

    if (this.press && !pointer.down) {
      const pet = pets.find((candidate) => candidate.id === this.press?.petId)
      const quick =
        this.press.elapsedMs <= CLICK_MAX_DURATION_MS &&
        Math.hypot(pointer.x - this.press.startX, pointer.y - this.press.startY) <=
          CLICK_MAX_DISTANCE
      if (pet && this.press.dragged) {
        pet.pointer.dragging = false
      } else if (pet && quick && this.hitTest(pet.id, pointer.x, pointer.y)) {
        pet.pointer.clicked = true
      }
      this.press = null
    }
    this.wasDown = pointer.down

    let dragging = false
    for (const pet of pets) {
      const interaction = pet.pointer
      if (!interaction.dragging) continue
      if (!pointer.down) {
        interaction.dragging = false
        continue
      }
      dragging = true
      const halfWidth = pet.profile.hitboxWidth / 2
      pet.position.x = clamp(
        pointer.x + interaction.dragOffsetX,
        bounds.left + halfWidth,
        bounds.right - halfWidth
      )
      pet.position.y = clamp(
        pointer.y + interaction.dragOffsetY,
        pet.profile.hitboxHeight,
        bounds.floorY
      )
      pet.facing = pointer.x >= pet.position.x ? 'right' : 'left'
      pet.targetPosition = undefined
      pet.targetPetId = undefined
    }

    for (const pet of pets) {
      const interaction = pet.pointer

      if (
        interaction.hovered &&
        !interaction.dragging &&
        !pointer.down &&
        canLookAtPointer(pet.state)
      ) {
        if (pointer.x - pet.position.x > HOVER_LOOK_MARGIN) pet.facing = 'right'
        else if (pet.position.x - pointer.x > HOVER_LOOK_MARGIN) pet.facing = 'left'
      }

      if (interaction.hovered && !pointer.down && !interaction.dragging && travel > 0) {
        interaction.pettingProgress += travel
      } else if (!interaction.petting) {
        interaction.pettingProgress = Math.max(
          0,
          interaction.pettingProgress - (PETTING_DECAY_PER_SEC * deltaMs) / 1000
        )
      }

      if (interaction.pettingProgress >= PETTING_DISTANCE) {
        interaction.pettingProgress = 0
        interaction.petting = true
      }
    }

    // Keep capture while a press is in flight so the release is never swallowed
    // by the window turning click-through mid-press.
    const capturing = dragging || hoveredPet !== undefined || this.press !== null
    return { capturing, hovering: hoveredPet !== undefined, dragging }
  }
}
