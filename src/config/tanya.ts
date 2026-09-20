import type { PetPersonality } from '../renderer/src/pets/PetPersonality'
import type { PetProfile } from '../renderer/src/pets/PetProfile'

export const tanyaProfile: PetProfile = {
  id: 'tanya',
  displayName: 'Tanya',
  baseScale: 1,
  spriteSet: 'tanya',
  bodyColor: 0xb28b62,
  accentColor: 0xd1bc98,
  earColor: 0x68615a,
  lopCoat: {
    highlight: 0xd2b58c,
    shadow: 0x736b60,
    ticking: 0x675d50,
    muzzle: 0x796956,
    nose: 0x51463d,
    toe: 0xe5ded0
  },
  bodyWidthScale: 1.3,
  bodyHeightScale: 1.5,
  headScale: 1.17,
  lopEars: true,
  earLengthScale: 1,
  earThicknessScale: 1.14,
  hitboxWidth: 120,
  hitboxHeight: 124
}

export const tanyaPersonality: PetPersonality = {
  activity: 0.3,
  curiosity: 0.8,
  sociability: 0.5,
  sleepiness: 0.7,
  groomingFrequency: 0.9,
  restlessness: 0.2,
  binkiness: 0.25
}
