import { randomRange } from '@shared/Random'
import { stateDurations } from '@config/defaults'
import {
  approachFoodTargetX,
  consumeKaleBite,
  findFood,
  isAtFood,
  nearestFood,
  type FoodItem
} from '../food/FoodItem'
import type { Pet } from '../pets/Pet'
import { isMovingState, type PetState } from '../pets/PetState'
import { chooseTargetX } from '../movement/screenBounds'
import { startMovement, updateMovement } from '../movement/movementController'
import { shouldDeployParachute, updateParachute } from '../movement/parachute'
import { pickTransition } from './StateMachine'
import { getWeightedTransitions } from './transitions'
import { findPet, type WorldContext } from './WorldContext'
import { approachTargetX, areTogether, isSettled, nearestOther } from './interactions'

export class BehaviourController {
  update(pet: Pet, ctx: WorldContext, deltaMs: number): void {
    pet.stateElapsedMs += deltaMs
    pet.decisionElapsedMs += deltaMs

    if (pet.pointer.dragging) {
      this.holdDragged(pet)
      return
    }

    if (pet.state === 'dragged') {
      if (shouldDeployParachute(pet, ctx.bounds)) {
        this.enter(pet, 'parachute', ctx)
      } else {
        pet.position.y = ctx.bounds.floorY
        this.enter(pet, 'idle', ctx)
      }
      return
    }

    if (pet.state === 'parachute') {
      pet.pointer.clicked = false
      pet.pointer.petting = false
      if (updateParachute(pet, ctx.bounds, deltaMs)) {
        pet.position.y = ctx.bounds.floorY
        this.enter(pet, ctx.random.next() < 0.6 ? 'sit' : 'idle', ctx)
      }
      return
    }

    if (pet.pointer.clicked) {
      pet.pointer.clicked = false
      this.enter(pet, 'pointerReaction', ctx)
      return
    }

    if (pet.pointer.petting) {
      pet.pointer.petting = false
      this.enter(pet, 'petted', ctx)
      return
    }

    if (pet.state === 'eat') {
      const done =
        pet.stateDurationMs === undefined || pet.stateElapsedMs >= pet.stateDurationMs
      if (!done) return
      this.finishEating(pet, ctx)
      return
    }

    if (isMovingState(pet.state)) {
      if (updateMovement(pet)) this.onArrival(pet, ctx)
      return
    }

    const finished =
      pet.stateDurationMs === undefined || pet.stateElapsedMs >= pet.stateDurationMs
    if (finished) this.chooseNext(pet, ctx)
  }

  private holdDragged(pet: Pet): void {
    pet.state = 'dragged'
    pet.stateElapsedMs = 0
    pet.targetPosition = undefined
    pet.targetPetId = undefined
    pet.targetFoodId = undefined
    pet.velocity.x = 0
    pet.velocity.y = 0
  }

  enter(pet: Pet, state: PetState, ctx: WorldContext): void {
    pet.state = state
    pet.stateElapsedMs = 0
    pet.decisionElapsedMs = 0
    pet.decisionIntervalMs = randomRange(ctx.random, 500, 900)

    if (state === 'parachute') {
      pet.targetPosition = undefined
      pet.targetPetId = undefined
      pet.targetFoodId = undefined
      pet.velocity = { x: 0, y: 0 }
      pet.stateDurationMs = undefined
      pet.stateStartPosition = { x: pet.position.x, y: pet.position.y }
      return
    }

    if (isMovingState(state)) {
      this.beginMovement(pet, state, ctx)
      return
    }

    pet.targetPosition = { x: pet.position.x, y: ctx.bounds.floorY }
    pet.stateDurationMs = this.durationFor(pet, state, ctx)

    if (state === 'sitWithOtherRabbit') {
      const target = findPet(ctx, pet.targetPetId)
      if (target) pet.facing = target.position.x >= pet.position.x ? 'right' : 'left'
    } else {
      pet.targetPetId = undefined
    }
  }

  private beginMovement(pet: Pet, state: PetState, ctx: WorldContext): void {
    if (state === 'approachOtherRabbit') {
      const target = nearestOther(pet, ctx.pets)
      if (!target) {
        pet.state = 'hop'
        startMovement(pet, 'hop', ctx.bounds, ctx.random)
        return
      }
      pet.targetPetId = target.id
      startMovement(
        pet,
        'approachOtherRabbit',
        ctx.bounds,
        ctx.random,
        approachTargetX(pet, target, ctx.bounds, ctx.random)
      )
      return
    }

    if (state === 'approachFood') {
      const food = nearestFood(pet, ctx.food)
      if (!food) {
        this.enter(pet, 'idle', ctx)
        return
      }
      pet.targetFoodId = food.id
      startMovement(
        pet,
        'approachFood',
        ctx.bounds,
        ctx.random,
        approachFoodTargetX(pet, food, ctx.bounds, ctx.random)
      )
      return
    }

    let targetX: number | undefined
    if (pet.avoidPetId) {
      const avoid = findPet(ctx, pet.avoidPetId)
      if (avoid) {
        const budget = 120 + pet.personality.restlessness * 280
        targetX = chooseTargetX(pet, ctx.bounds, ctx.random, budget, avoid.position.x)
      }
      pet.avoidPetId = undefined
    }
    startMovement(pet, state, ctx.bounds, ctx.random, targetX)
  }

  private onArrival(pet: Pet, ctx: WorldContext): void {
    if (pet.state === 'approachFood') {
      const food = findFood(ctx.food, pet.targetFoodId)
      if (food && isAtFood(pet, food)) {
        this.startEating(pet, food, ctx)
        return
      }
      pet.targetFoodId = undefined
      this.enter(pet, 'idle', ctx)
      return
    }

    const target = findPet(ctx, pet.targetPetId)
    if (pet.state === 'approachOtherRabbit' && target && areTogether(pet, target)) {
      this.sitTogether(pet, target, ctx)
      return
    }
    this.enter(pet, ctx.random.next() < 0.45 ? 'sit' : 'idle', ctx)
  }

  private startEating(pet: Pet, food: FoodItem, ctx: WorldContext): void {
    this.enter(pet, 'eat', ctx)
    pet.targetFoodId = food.id
    pet.targetPosition = { x: food.position.x, y: ctx.bounds.floorY }
    pet.facing = food.position.x >= pet.position.x ? 'right' : 'left'
  }

  private finishEating(pet: Pet, ctx: WorldContext): void {
    consumeKaleBite(ctx.food, pet.targetFoodId)
    pet.targetFoodId = undefined
    this.enter(pet, ctx.random.next() < 0.5 ? 'sit' : 'idle', ctx)
  }

  private sitTogether(pet: Pet, target: Pet, ctx: WorldContext): void {
    this.enter(pet, 'sitWithOtherRabbit', ctx)
    pet.targetPetId = target.id
    pet.facing = target.position.x >= pet.position.x ? 'right' : 'left'

    if (isSettled(target)) {
      this.enter(target, 'sitWithOtherRabbit', ctx)
      target.targetPetId = pet.id
      target.facing = pet.position.x >= target.position.x ? 'right' : 'left'
    }
  }

  private chooseNext(pet: Pet, ctx: WorldContext): void {
    const previous = pet.state
    const candidate = pickTransition(ctx.random, getWeightedTransitions(pet, ctx))
    const next = candidate?.state ?? 'idle'

    if (previous === 'sitWithOtherRabbit' && next !== 'sitWithOtherRabbit') {
      pet.avoidPetId = pet.targetPetId
    }

    this.enter(pet, next, ctx)
  }

  private durationFor(pet: Pet, state: PetState, ctx: WorldContext): number {
    const range = stateDurations[state]
    if (!range) return randomRange(ctx.random, 1000, 3000)

    let [min, max] = range
    const p = pet.personality

    if (state === 'sleep') {
      const factor = 0.6 + p.sleepiness
      min *= factor
      max *= factor
    } else if (state === 'sit') {
      const factor = 1.2 - p.activity * 0.5
      min *= factor
      max *= factor
    } else if (state === 'idle') {
      const factor = 1.2 - p.activity * 0.6
      min *= factor
      max *= factor
    } else if (state === 'sitWithOtherRabbit') {
      const factor = 0.7 + p.sociability
      min *= factor
      max *= factor
    }

    return randomRange(ctx.random, min, max)
  }
}
