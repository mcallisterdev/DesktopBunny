export interface Vector2 {
  x: number
  y: number
}

export function makeVector2(x = 0, y = 0): Vector2 {
  return { x, y }
}

export function distanceBetween(a: Vector2, b: Vector2): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}
