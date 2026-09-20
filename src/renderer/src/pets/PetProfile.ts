export interface PetProfile {
  id: string
  displayName: string
  baseScale: number
  spriteSet: string
  bodyColor: number
  accentColor: number
  earColor?: number
  /** Shaded white coat with soft silver markings and visible iris colour. */
  uprightCoat?: {
    highlight: number
    shadow: number
    marking: number
    innerEar: number
    nose: number
    iris: number
  }
  /** Optional shaded, ticked coat for the naturalistic lop sprite. */
  lopCoat?: {
    highlight: number
    shadow: number
    ticking: number
    muzzle: number
    nose: number
    toe: number
  }
  bodyWidthScale?: number
  bodyHeightScale?: number
  headScale?: number
  lopEars?: boolean
  earLengthScale?: number
  earThicknessScale?: number
  visualOffsetX?: number
  visualOffsetY?: number
  /** Stacking order for overlapping pets; higher values draw on top. */
  renderOrder?: number
  hitboxWidth: number
  hitboxHeight: number
}
