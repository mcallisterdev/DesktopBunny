import { describe, expect, it, vi } from 'vitest'
import { lazyFrames } from '@renderer/rendering/lazyFrames'
import { animationClips } from '@renderer/rendering/spriteAnimations'

describe('lazy animation frames', () => {
  it('draws only the initial visible frame for each bunny during startup', () => {
    const draw = vi.fn((index: number) => ({ index }))
    const pets = Array.from({ length: 2 }, () =>
      Object.fromEntries(Object.entries(animationClips).map(([clip, definition]) =>
        [clip, lazyFrames(definition.frames, draw)]
      ))
    )
    expect(draw).not.toHaveBeenCalled()
    for (const pet of pets) {
      expect(pet.idle[0]).toEqual({ index: 0 })
      expect(pet.idle.length).toBe(animationClips.idle.frames)
    }
    expect(draw).toHaveBeenCalledTimes(2)
  })

  it('caches each frame across animation loops and supports switching clips', () => {
    const draw = vi.fn((index: number) => ({ index }))
    const frames = lazyFrames(8, draw)
    const last = frames[7]
    const first = frames[0]
    expect(draw.mock.calls).toEqual([[7], [0]])
    expect(frames[7]).toBe(last)
    expect(frames[0]).toBe(first)
    expect(draw).toHaveBeenCalledTimes(2)
    expect([...frames].map((frame) => frame.index)).toEqual([0, 1, 2, 3, 4, 5, 6, 7])
    expect(draw).toHaveBeenCalledTimes(8)
    expect([...frames]).toHaveLength(8)
    expect(draw).toHaveBeenCalledTimes(8)
  })
})
