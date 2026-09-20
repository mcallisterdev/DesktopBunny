import { describe, expect, it } from 'vitest'
import { createSeededRandomSource, weightedPick } from '@shared/Random'

describe('random', () => {
  it('is deterministic for a given seed', () => {
    const a = createSeededRandomSource(123)
    const b = createSeededRandomSource(123)
    const seqA = Array.from({ length: 5 }, () => a.next())
    const seqB = Array.from({ length: 5 }, () => b.next())
    expect(seqA).toEqual(seqB)
  })

  it('produces values in the unit interval', () => {
    const random = createSeededRandomSource(7)
    for (let i = 0; i < 200; i += 1) {
      const value = random.next()
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })

  it('respects relative weights', () => {
    const random = createSeededRandomSource(1)
    const counts = { a: 0, b: 0 }
    for (let i = 0; i < 1000; i += 1) {
      const pick = weightedPick(random, [
        { item: 'a', weight: 3 },
        { item: 'b', weight: 1 }
      ])
      if (pick === 'a') counts.a += 1
      else counts.b += 1
    }
    expect(counts.a).toBeGreaterThan(counts.b)
  })
})
