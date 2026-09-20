// Preserve array indexing while deferring expensive drawing until a frame is
// displayed. Replace each getter with its result so frames are only drawn once.
export function lazyFrames<T>(count: number, createFrame: (index: number) => T): T[] {
  const frames = new Array<T>(count)
  for (let index = 0; index < count; index += 1) {
    Object.defineProperty(frames, index, {
      configurable: true,
      enumerable: true,
      get(): T {
        const frame = createFrame(index)
        Object.defineProperty(frames, index, { value: frame, writable: true })
        return frame
      }
    })
  }
  return frames
}
