import { randomRange, type RandomSource } from '@shared/Random'
import { clamp } from '@shared/Vector2'
import type { DesktopBounds } from '@shared/types'
import type { Pet } from '../pets/Pet'

export interface ScreenBounds {
  left: number
  right: number
  floorY: number
  width: number
  desktop: DesktopBounds
}

export function createScreenBounds(desktop: DesktopBounds, floorMargin: number): ScreenBounds {
  return {
    left: 0,
    right: desktop.width,
    floorY: desktop.height - floorMargin,
    width: desktop.width,
    desktop
  }
}

export function clampX(x: number, halfWidth: number, bounds: ScreenBounds): number {
  return clamp(x, bounds.left + halfWidth, bounds.right - halfWidth)
}

export function chooseTargetX(
  pet: Pet,
  bounds: ScreenBounds,
  random: RandomSource,
  maxDistance: number,
  avoidX?: number
): number {
  const half = pet.profile.hitboxWidth / 2
  let minX = clamp(pet.position.x - maxDistance, bounds.left + half, bounds.right - half)
  let maxX = clamp(pet.position.x + maxDistance, bounds.left + half, bounds.right - half)

  if (avoidX !== undefined && Math.abs(avoidX - pet.position.x) < maxDistance) {
    if (avoidX >= pet.position.x) {
      maxX = clamp(avoidX - maxDistance * 0.6, minX, maxX)
    } else {
      minX = clamp(avoidX + maxDistance * 0.6, minX, maxX)
    }
  }

  if (maxX <= minX) return clamp(pet.position.x, bounds.left + half, bounds.right - half)
  return randomRange(random, minX, maxX)
}
