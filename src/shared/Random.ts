export interface RandomSource {
  next(): number
}

export const mathRandomSource: RandomSource = {
  next: () => Math.random()
}

export function createSeededRandomSource(seed: number): RandomSource {
  let state = seed >>> 0
  return {
    next: () => {
      state = (state + 0x6d2b79f5) >>> 0
      let t = state
      t = Math.imul(t ^ (t >>> 15), t | 1)
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  }
}

export function randomRange(random: RandomSource, min: number, max: number): number {
  return min + (max - min) * random.next()
}

export interface WeightedItem<T> {
  item: T
  weight: number
}

export function weightedPick<T>(random: RandomSource, items: WeightedItem<T>[]): T | undefined {
  const usable = items.filter((entry) => entry.weight > 0)
  if (usable.length === 0) return undefined
  const total = usable.reduce((sum, entry) => sum + entry.weight, 0)
  let roll = random.next() * total
  for (const entry of usable) {
    roll -= entry.weight
    if (roll <= 0) return entry.item
  }
  return usable[usable.length - 1].item
}
