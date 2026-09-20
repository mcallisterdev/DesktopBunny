import type { Pet } from '../pets/Pet'

export interface Hitbox {
  x: number
  y: number
  width: number
  height: number
}

export function petHitbox(pet: Pet, scale = 1): Hitbox {
  const width = pet.profile.hitboxWidth * scale
  const height = pet.profile.hitboxHeight * scale
  return {
    x: pet.position.x - width / 2,
    y: pet.position.y - height,
    width,
    height
  }
}

export function pointInHitbox(pet: Pet, x: number, y: number, scale = 1): boolean {
  const hitbox = petHitbox(pet, scale)
  return (
    x >= hitbox.x &&
    x <= hitbox.x + hitbox.width &&
    y >= hitbox.y &&
    y <= hitbox.y + hitbox.height
  )
}
