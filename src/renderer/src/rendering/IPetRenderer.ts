import type { Pet } from '../pets/Pet'

export interface IPetRenderer {
  createPet(pet: Pet): void
  updatePet(pet: Pet, deltaMs: number): void
  removePet(petId: string): void
  hitTest(petId: string, screenX: number, screenY: number): boolean
  setScale(scale: number): void
  setDebug(debug: boolean): void
}
