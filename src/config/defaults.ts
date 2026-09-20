export interface PetSettings {
  enabled: boolean
  scale: number
  volume: number
  launchAtLogin: boolean
  debug: boolean
}

export const defaultSettings: PetSettings = {
  enabled: true,
  scale: 1,
  volume: 0,
  launchAtLogin: false,
  debug: false
}

export const scalePresets: Record<'small' | 'medium' | 'large', number> = {
  small: 0.7,
  medium: 1,
  large: 1.45
}

export const floorMargin = 28

export const behaviourTickMs = 250

export const stateDurations: Record<string, [number, number]> = {
  idle: [2000, 8000],
  binkie: [1000, 1000],
  lookAround: [1000, 3000],
  sit: [3000, 12000],
  groom: [3000, 7000],
  sleep: [15000, 120000],
  sitWithOtherRabbit: [4000, 14000],
  pointerReaction: [600, 1100],
  petted: [2500, 5000],
  eat: [3000, 6000]
}
