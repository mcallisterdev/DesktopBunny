import type { PetState } from '../pets/PetState'

export interface AnimationClip {
  frames: number
  fps: number
  loop: boolean
}

export const animationMap: Record<PetState, string> = {
  idle: 'idle',
  lookAround: 'look',
  hop: 'hop',
  run: 'run',
  sit: 'sit',
  groom: 'groom',
  sleep: 'sleep',
  approachOtherRabbit: 'hop',
  sitWithOtherRabbit: 'sit',
  pointerReaction: 'look',
  petted: 'groom',
  dragged: 'idle',
  parachute: 'parachute',
  approachFood: 'hop',
  eat: 'groom'
}

export const animationClips: Record<string, AnimationClip> = {
  idle: { frames: 6, fps: 6, loop: true },
  look: { frames: 8, fps: 8, loop: true },
  hop: { frames: 8, fps: 14, loop: true },
  run: { frames: 8, fps: 18, loop: true },
  sit: { frames: 4, fps: 4, loop: true },
  groom: { frames: 12, fps: 10, loop: true },
  sleep: { frames: 4, fps: 2, loop: true },
  parachute: { frames: 8, fps: 6, loop: true }
}
