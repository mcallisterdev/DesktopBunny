export interface PetPointerState {
  hovered: boolean
  dragging: boolean
  petting: boolean
  pettingProgress: number
  clicked: boolean
  dragOffsetX: number
  dragOffsetY: number
}

export function createPetPointerState(): PetPointerState {
  return {
    hovered: false,
    dragging: false,
    petting: false,
    pettingProgress: 0,
    clicked: false,
    dragOffsetX: 0,
    dragOffsetY: 0
  }
}
