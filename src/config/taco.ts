import type { PetPersonality } from '../renderer/src/pets/PetPersonality'
import type { PetProfile } from '../renderer/src/pets/PetProfile'

export const tacoProfile: PetProfile = {
  id: 'taco',
  displayName: 'Taco',
  baseScale: 1,
  spriteSet: 'taco',
  bodyColor: 0xf3f3ef,
  accentColor: 0xe2e5e5,
  uprightCoat: {
    highlight: 0xffffff,
    shadow: 0xbfc6ca,
    marking: 0x929da5,
    innerEar: 0xdcaeb1,
    nose: 0xb68f94,
    iris: 0x8199ac
  },
  bodyWidthScale: 1.03,
  bodyHeightScale: 1.2,
  headScale: 1.04,
  earLengthScale: 1,
  earThicknessScale: 1.05,
  renderOrder: 1,
  hitboxWidth: 120,
  hitboxHeight: 154
}

export const tacoPersonality: PetPersonality = {
  activity: 0.9,
  curiosity: 0.5,
  sociability: 0.7,
  sleepiness: 0.4,
  groomingFrequency: 0.7,
  restlessness: 0.8,
  binkiness: 0.8
}
