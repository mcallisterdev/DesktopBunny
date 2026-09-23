import { CanvasSource, Texture } from 'pixi.js'
import type { PetProfile } from '../pets/PetProfile'
import { animationClips } from './spriteAnimations'
import { lazyFrames } from './lazyFrames'

export const FRAME_SIZE = 200
export const FRAME_ANCHOR_X = 100
export const FRAME_ANCHOR_Y = 188

// Frames are rasterised at a higher resolution than they are laid out at so the
// texture still has detail when the renderer scales a large bunny up. This
// covers the largest size preset (1.45x) across the capped device pixel ratio (2x).
export const SPRITE_SUPERSAMPLE = 3

const OUTLINE_WIDTH = 2.5
const PAW_DROP = 4

type Transform = [number, number, number, number, number, number]

/** Applies a local transform on top of a previously captured canvas transform. */
function setComposedTransform(
  ctx: CanvasRenderingContext2D,
  base: DOMMatrix,
  transform: Transform
): void {
  const [a, b, c, d, e, f] = transform
  ctx.setTransform(
    base.a * a + base.c * b,
    base.b * a + base.d * b,
    base.a * c + base.c * d,
    base.b * c + base.d * d,
    base.a * e + base.c * f + base.e,
    base.b * e + base.d * f + base.f
  )
}

/** Strokes a silhouette while clipping out the interior where a neighbouring shape overlaps. */
function strokeClippedOutline(
  ctx: CanvasRenderingContext2D,
  stroke: Path2D,
  strokeTransform: Transform,
  color: string,
  thickness: number,
  holes: Array<{ path: Path2D; transform: Transform }>
): void {
  ctx.save()
  const base = ctx.getTransform()
  for (const hole of holes) {
    setComposedTransform(ctx, base, hole.transform)
    const region = new Path2D()
    region.rect(-10000, -10000, 20000, 20000)
    region.addPath(hole.path)
    ctx.clip(region, 'evenodd')
  }
  setComposedTransform(ctx, base, strokeTransform)
  ctx.strokeStyle = color
  ctx.lineWidth = thickness
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.stroke(stroke)
  ctx.restore()
}

export interface PetSpriteSet {
  textures: Record<string, Texture[]>
  anchorX: number
  anchorY: number
  frameWidth: number
  frameHeight: number
}

interface Pose {
  lift: number
  squashX: number
  squashY: number
  headTurn: number
  earAngle: number
  eyesClosed: boolean
  /** Whole-body rotation in radians, used for the mid-air binkie spin. */
  spin: number
  /** Ground shadows are baked into the frame, so hide them when the bunny is airborne. */
  shadow: boolean
  /** Sideways tilt of the head in radians, used while leaning into a grooming paw. */
  headTilt: number
  /** Downward offset of the head in head-local pixels. */
  headDip: number
  /** 0 = front paws tucked at the chest, 1 = raised up to the face. */
  groomPawLift: number
  /** Height the raised paws have wiped to: 0 = muzzle, 1 = brow. */
  groomPawY: number
  /** Which ear is being pulled to the mouth: -1 left, 0 none, 1 right. */
  groomEarSide: number
  /** 0..1 how far the chosen ear is dragged down to be nibbled. */
  groomEarPull: number
  /** 0..1 flick of the tongue while licking a paw or ear. */
  groomTongue: number
}

function hexToRgb(hex: number): [number, number, number] {
  return [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255]
}

function rgbCss(hex: number, alpha = 1): string {
  const [r, g, b] = hexToRgb(hex)
  return `rgba(${r},${g},${b},${alpha})`
}

function shade(hex: number, amount: number): number {
  const [r, g, b] = hexToRgb(hex)
  const adjust = (value: number): number =>
    Math.max(0, Math.min(255, Math.round(value + 255 * amount)))
  return (adjust(r) << 16) | (adjust(g) << 8) | adjust(b)
}

function smooth01(value: number): number {
  const clamped = Math.min(1, Math.max(0, value))
  return clamped * clamped * (3 - 2 * clamped)
}

type GroomPose = Pick<
  Pose,
  | 'groomPawLift'
  | 'groomPawY'
  | 'groomEarSide'
  | 'groomEarPull'
  | 'groomTongue'
  | 'headTilt'
  | 'headDip'
  | 'eyesClosed'
>

/**
 * Drives a full grooming session from a 0..1 phase. The bunny lifts its front
 * paws, washes its face with a couple of quick upward strokes, then hooks a paw
 * over an ear, pulls it down and nibbles along it before settling back to rest.
 * The phase lands back on the resting pose at 1 so the clip loops without a pop.
 */
function groomPose(t: number): GroomPose {
  const RAISE = 0.1
  const EAR_START = 0.56
  const EAR_PEAK = 0.66
  const EAR_END = 0.8
  const LOWER = 0.94

  const lift = Math.min(
    smooth01(t / RAISE),
    smooth01((LOWER - t) / (LOWER - EAR_END))
  )
  // Two full wipe strokes between arriving at the face and reaching for the ear.
  const wash =
    (1 - Math.cos(smooth01((t - RAISE) / (EAR_START - RAISE)) * Math.PI * 4)) / 2
  // A bump so ear grooming eases out of the washing rhythm on both sides.
  const ear =
    smooth01((t - EAR_START) / (EAR_PEAK - EAR_START)) *
    smooth01((EAR_END - t) / (EAR_END - EAR_PEAK))

  return {
    groomPawLift: lift,
    groomPawY: wash,
    groomEarSide: ear > 0.01 ? 1 : 0,
    groomEarPull: ear,
    groomTongue: Math.max(0, Math.sin((t - EAR_START) * Math.PI * 14)) * ear,
    headTilt: ear * 0.16,
    headDip: (1 - wash) * 3 * (1 - ear) + ear * 2.5,
    eyesClosed: lift > 0.4
  }
}

function poseFor(clip: string, frame: number, count: number): Pose {
  const t = count > 1 ? frame / count : 0
  const wave = Math.sin(t * Math.PI * 2)
  const base: Pose = {
    lift: 0,
    squashX: 1,
    squashY: 1,
    headTurn: 0,
    earAngle: 0,
    eyesClosed: false,
    spin: 0,
    shadow: true,
    headTilt: 0,
    headDip: 0,
    groomPawLift: 0,
    groomPawY: 0,
    groomEarSide: 0,
    groomEarPull: 0,
    groomTongue: 0
  }

  switch (clip) {
    case 'idle':
      return { ...base, squashY: 1 + wave * 0.02, earAngle: wave * 3 }
    case 'look':
      return { ...base, headTurn: wave * 8, earAngle: wave * 6, squashY: 1 + wave * 0.01 }
    case 'hop': {
      const hop = Math.max(0, Math.sin(t * Math.PI))
      return {
        ...base,
        lift: hop * 34,
        squashX: 1 - hop * 0.06,
        squashY: 1 + hop * 0.08,
        earAngle: -hop * 12
      }
    }
    case 'binkie': {
      // A happy leap: spring off the ground, twist a full turn at the apex and
      // land where it started. Progress uses frame/(count-1) so the last frame
      // completes the 360 rather than resting a fraction short.
      const progress = count > 1 ? frame / (count - 1) : 1
      const leap = Math.sin(progress * Math.PI)
      return {
        ...base,
        lift: leap * 42,
        spin: progress * Math.PI * 2,
        squashX: 1 - leap * 0.05,
        squashY: 1 + leap * 0.07,
        earAngle: -leap * 18,
        shadow: false
      }
    }
    case 'run': {
      const hop = Math.abs(Math.sin(t * Math.PI * 2))
      return {
        ...base,
        lift: hop * 22,
        squashX: 1 - hop * 0.08,
        squashY: 1 + hop * 0.05,
        earAngle: -18 + wave * 4
      }
    }
    case 'sit':
      return { ...base, squashY: 0.94 + wave * 0.01, earAngle: wave * 2 }
    case 'groom': {
      const groom = groomPose(t)
      return {
        ...base,
        ...groom,
        // A little horizontal lean keeps the wash strokes from reading as a
        // rigid vertical slide, and the free ear twitches softly.
        headTurn: groom.headTilt * 6,
        earAngle: wave * 3
      }
    }
    case 'eat': {
      // Head stays dipped to the food with a small nibbling bob.
      const nibble = Math.sin(t * Math.PI * 2)
      return {
        ...base,
        headDip: 7 + Math.max(0, nibble) * 1.5,
        headTurn: nibble * 1.5,
        earAngle: 3 + nibble * 3,
        squashY: 0.98 + nibble * 0.01
      }
    }
    case 'pet': {
      // Melts into the hand: eyes shut, body softly squashing to a slow purr
      // while the head nuzzles side to side and the ears flop loose.
      const purr = Math.sin(t * Math.PI * 2)
      const nuzzle = Math.sin(t * Math.PI * 2 - Math.PI / 2)
      return {
        ...base,
        eyesClosed: true,
        squashX: 1 + 0.02 + purr * 0.02,
        squashY: 0.95 + purr * 0.035,
        lift: Math.max(0, purr) * 2,
        headTurn: nuzzle * 8,
        earAngle: -10 + purr * 4
      }
    }
    case 'sleep':
      return { ...base, squashY: 0.86 + wave * 0.015, eyesClosed: true, earAngle: -22 }
    case 'parachute':
      return {
        ...base,
        shadow: false,
        squashX: 1 - wave * 0.02,
        squashY: 1.05 + wave * 0.02,
        headTurn: wave * 2.5,
        earAngle: 16 + wave * 6
      }
    default:
      return base
  }
}

function drawEar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  body: number,
  accent: number,
  scale = 1,
  lengthScale = 1,
  thicknessScale = 1
): void {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  const centerY = -28 * scale * lengthScale
  ctx.fillStyle = rgbCss(body)
  ctx.beginPath()
  ctx.ellipse(0, centerY, 11 * scale * thicknessScale, 34 * scale * lengthScale, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = rgbCss(accent)
  ctx.beginPath()
  ctx.ellipse(0, centerY, 5.5 * scale * thicknessScale, 24 * scale * lengthScale, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function lopEarPoints(
  headCX: number,
  headCY: number,
  headS: number,
  sway: number,
  lengthScale = 1,
  thicknessScale = 1
): Array<{ x: number; y: number; r: number }> {
  const steps = 24
  const hookSteps = 7
  const step = (62 * headS * lengthScale) / steps
  const baseHeading = 0.6 + sway
  const finalHeading = Math.PI / 2 - 0.05 + sway

  const points: Array<{ x: number; y: number; r: number }> = []
  let heading = baseHeading
  let x = headCX + 16 * headS
  let y = headCY - 18 * headS
  for (let i = 0; i <= steps; i += 1) {
    const t = Math.min(1, i / hookSteps)
    const ease = t * t * (3 - 2 * t)
    heading = baseHeading + (finalHeading - baseHeading) * ease
    points.push({ x, y, r: (11 - 3 * (i / steps)) * headS * thicknessScale })
    x += Math.cos(heading) * step
    y += Math.sin(heading) * step
  }
  return points
}

function drawLopEar(
  ctx: CanvasRenderingContext2D,
  headCX: number,
  headCY: number,
  side: number,
  headS: number,
  body: number,
  sway: number,
  lengthScale = 1,
  thicknessScale = 1
): void {
  const points = lopEarPoints(headCX, headCY, headS, sway, lengthScale, thicknessScale)
  if (side < 0) {
    for (const point of points) point.x = headCX - (point.x - headCX)
  }

  ctx.fillStyle = rgbCss(body)
  ctx.beginPath()
  for (const point of points) {
    ctx.moveTo(point.x + point.r, point.y)
    ctx.arc(point.x, point.y, point.r, 0, Math.PI * 2)
  }
  ctx.fill()
}

function addLopEarPath(
  ctx: CanvasRenderingContext2D,
  headCX: number,
  headCY: number,
  side: number,
  headS: number,
  sway: number,
  grow: number,
  lengthScale = 1,
  thicknessScale = 1
): void {
  const points = lopEarPoints(headCX, headCY, headS, sway, lengthScale, thicknessScale)
  if (side < 0) {
    for (const point of points) point.x = headCX - (point.x - headCX)
  }
  for (const point of points) {
    const r = point.r + grow
    ctx.moveTo(point.x + r, point.y)
    ctx.arc(point.x, point.y, r, 0, Math.PI * 2)
  }
}

function addEarPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  scale: number,
  grow: number,
  lengthScale = 1,
  thicknessScale = 1
): void {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.ellipse(
    0,
    -28 * scale * lengthScale,
    11 * scale * thicknessScale + grow,
    34 * scale * lengthScale + grow,
    0,
    0,
    Math.PI * 2
  )
  ctx.restore()
}

/** Coat marks use local coordinates and a fixed seed so they never flicker between frames. */
function furTexture(
  ctx: CanvasRenderingContext2D,
  path: Path2D,
  bounds: [number, number, number, number],
  light: number,
  dark: number,
  density: number,
  seed: number
): void {
  let state = seed
  const random = (): number => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 4294967296
  }
  const [x, y, w, h] = bounds
  ctx.save()
  ctx.clip(path)
  ctx.lineCap = 'round'
  for (let i = 0; i < density; i += 1) {
    const px = x + random() * w
    const py = y + random() * h
    const length = 1.2 + random() * 3
    ctx.strokeStyle = rgbCss(i % 3 === 0 ? dark : light)
    ctx.globalAlpha = 0.12 + random() * 0.16
    ctx.lineWidth = 0.45 + random() * 0.5
    ctx.beginPath()
    ctx.moveTo(px, py)
    ctx.lineTo(px + (px - x - w / 2) * 0.025, py + length)
    ctx.stroke()
  }
  ctx.restore()
}

function ovalPath(x: number, y: number, rx: number, ry: number): Path2D {
  const path = new Path2D()
  path.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2)
  return path
}

function shadedFur(
  ctx: CanvasRenderingContext2D,
  path: Path2D,
  bounds: [number, number, number, number],
  light: number,
  base: number,
  shadow: number,
  ticking: number,
  seed: number,
  density = 220,
  outline = true
): void {
  const [x, y, w, h] = bounds
  const gradient = ctx.createRadialGradient(x + w * 0.38, y + h * 0.25, 1, x + w * 0.5, y + h * 0.45, Math.max(w, h) * 0.65)
  gradient.addColorStop(0, rgbCss(light))
  gradient.addColorStop(0.48, rgbCss(base))
  gradient.addColorStop(1, rgbCss(shadow))
  ctx.fillStyle = gradient
  ctx.fill(path)
  if (outline) {
    ctx.strokeStyle = rgbCss(shade(shadow, -0.13))
    ctx.lineWidth = 1.5
    ctx.stroke(path)
  }
  furTexture(ctx, path, bounds, light, ticking, density, seed)
}

/** Ground-contact paw silhouette, filled separately and outlined with the body as one shape. */
function pawPath(): Path2D {
  const paw = new Path2D()
  paw.moveTo(-8, -22)
  paw.bezierCurveTo(-3, -25, 3, -23, 5, -18)
  paw.bezierCurveTo(7, -13, 13, -12, 16, -8)
  paw.bezierCurveTo(19, -5, 18, -1.5, 14, -1)
  paw.quadraticCurveTo(11, 0.5, 8, -0.5)
  paw.quadraticCurveTo(4, 1, 1, -0.5)
  paw.bezierCurveTo(-5, 0, -10, -2, -10, -7)
  paw.bezierCurveTo(-10, -12, -7, -16, -8, -22)
  paw.closePath()
  return paw
}

/** Fur-covered paws with a narrow ankle, sloping instep and soft toe contours. */
function drawPaw(
  ctx: CanvasRenderingContext2D,
  x: number,
  groundY: number,
  side: number,
  width: number,
  light: number,
  base: number,
  shadow: number,
  ticking: number,
  toeColor?: number,
  greyColor?: number
): void {
  ctx.save()
  ctx.translate(x, groundY)
  ctx.scale(side * width, 1)
  const paw = pawPath()
  shadedFur(ctx, paw, [-10, -24, 29, 25], light, base, shadow, ticking, 310 + side, 100, false)
  if (greyColor !== undefined) {
    coatPatch(ctx, paw, -5, -8, 8, 13, greyColor, 0.72)
  }
  if (toeColor !== undefined) {
    coatPatch(ctx, paw, 10, -3.5, 9, 4.5, toeColor, 0.5)
  }
  ctx.strokeStyle = rgbCss(shadow, 0.6)
  ctx.lineWidth = 0.65
  for (const toe of [1, 8]) {
    ctx.beginPath()
    ctx.moveTo(toe, -1)
    ctx.quadraticCurveTo(toe + 1.5, -3, toe - 0.5, -5.5)
    ctx.stroke()
  }
  ctx.restore()
}

/** Narrow shoulders flow into weight-bearing haunches and a tucked lower belly. */
function seatedBodyPath(): Path2D {
  const body = new Path2D()
  body.moveTo(0, -33)
  body.bezierCurveTo(15, -34, 24, -25, 29, -15)
  body.bezierCurveTo(34, -6, 45, 0, 45, 13)
  body.bezierCurveTo(46, 26, 34, 31, 23, 30)
  body.bezierCurveTo(14, 29, 9, 26, 0, 27)
  body.bezierCurveTo(-9, 26, -14, 29, -23, 30)
  body.bezierCurveTo(-34, 31, -46, 26, -45, 13)
  body.bezierCurveTo(-45, 0, -34, -6, -29, -15)
  body.bezierCurveTo(-24, -25, -15, -34, 0, -33)
  body.closePath()
  return body
}

/** Soft folds separate the tucked hind legs from the chest without hard seams. */
function drawHaunches(ctx: CanvasRenderingContext2D, shadow: number): void {
  ctx.save()
  ctx.lineCap = 'round'
  for (const side of [-1, 1]) {
    const crease = ctx.createLinearGradient(0, -5, 0, 27)
    crease.addColorStop(0, rgbCss(shadow, 0))
    crease.addColorStop(0.55, rgbCss(shadow, 0.38))
    crease.addColorStop(1, rgbCss(shadow, 0))
    ctx.strokeStyle = crease
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.moveTo(side * 28, -5)
    ctx.bezierCurveTo(side * 18, -1, side * 17, 14, side * 24, 26)
    ctx.stroke()
  }
  ctx.restore()
}

/**
 * A small front paw on a foreleg reaching up from the chest. Coordinates are in
 * head-local space so the paw tracks the head while the bunny washes its face.
 */
function drawGroomPaw(
  ctx: CanvasRenderingContext2D,
  shoulderX: number,
  shoulderY: number,
  handX: number,
  handY: number,
  scale: number,
  light: number,
  base: number,
  shadow: number,
  ticking: number,
  toe?: number
): void {
  const outline = rgbCss(shade(shadow, -0.13))
  ctx.save()
  ctx.lineCap = 'round'
  // Foreleg: a tapered capsule from the shoulder down to the wrist.
  ctx.strokeStyle = outline
  ctx.lineWidth = 9.5 * scale + 1.5
  ctx.beginPath()
  ctx.moveTo(shoulderX, shoulderY)
  ctx.lineTo(handX, handY)
  ctx.stroke()
  const arm = ctx.createLinearGradient(shoulderX, shoulderY, handX, handY)
  arm.addColorStop(0, rgbCss(shadow))
  arm.addColorStop(0.55, rgbCss(base))
  arm.addColorStop(1, rgbCss(light))
  ctx.strokeStyle = arm
  ctx.lineWidth = 9.5 * scale
  ctx.beginPath()
  ctx.moveTo(shoulderX, shoulderY)
  ctx.lineTo(handX, handY)
  ctx.stroke()

  // The paw pad itself, with the toes pointed along the forearm.
  ctx.translate(handX, handY)
  ctx.rotate(Math.atan2(handY - shoulderY, handX - shoulderX) + Math.PI / 2)
  const paw = ovalPath(0, 0, 7.4 * scale, 8.8 * scale)
  shadedFur(
    ctx,
    paw,
    [-8 * scale, -9 * scale, 16 * scale, 18 * scale],
    light,
    base,
    shadow,
    ticking,
    410,
    80
  )
  if (toe !== undefined) coatPatch(ctx, paw, 0, -2.5 * scale, 5 * scale, 4 * scale, toe, 0.5)
  ctx.strokeStyle = rgbCss(shadow, 0.55)
  ctx.lineWidth = 0.6
  for (const toeX of [-2.6, 2.6]) {
    ctx.beginPath()
    ctx.moveTo(toeX * scale, 2 * scale)
    ctx.quadraticCurveTo(toeX * scale, -3 * scale, toeX * 0.6 * scale, -6 * scale)
    ctx.stroke()
  }
  ctx.restore()
}

/** Raises the front paws to the face and hooks the chosen ear while grooming. */
function drawGroomingPaws(
  ctx: CanvasRenderingContext2D,
  pose: Pose,
  light: number,
  base: number,
  shadow: number,
  ticking: number,
  earPawX: number,
  earPawY: number,
  toe?: number
): void {
  if (pose.groomPawLift <= 0.01) return
  const lift = pose.groomPawLift
  const washY = 19 - pose.groomPawY * 34
  for (const side of [-1, 1] as const) {
    // The paw that hooks the ear leaves the muzzle for wherever the folded ear
    // tip has been pulled to; the other paw keeps washing.
    const pull = pose.groomEarSide !== 0 && side === pose.groomEarSide ? pose.groomEarPull : 0
    const handX = side * (12 + (earPawX - 12) * pull)
    const handY = 46 + (washY + (earPawY - washY) * pull - 46) * lift
    drawGroomPaw(
      ctx,
      side * 16,
      44,
      handX,
      handY,
      0.92,
      light,
      base,
      shadow,
      ticking,
      toe
    )
  }
}

/** A small tongue flick while licking a paw or the pulled ear. */
function drawGroomTongue(ctx: CanvasRenderingContext2D, pose: Pose): void {
  if (pose.groomTongue <= 0.01) return
  const lick = pose.groomTongue
  ctx.save()
  ctx.strokeStyle = 'rgba(150,70,88,0.55)'
  ctx.lineWidth = 0.6
  ctx.beginPath()
  ctx.moveTo(0, 18)
  ctx.lineTo(0, 18 + lick * 5)
  ctx.stroke()
  ctx.fillStyle = 'rgba(216,124,142,0.95)'
  ctx.beginPath()
  ctx.ellipse(0, 20 + lick * 2, 3.4, 2.4 + lick * 3.6, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

/**
 * Taco's tall upright ear. A `pull` of 1 folds it forward over the cheek so the
 * tip can be drawn to the mouth; at 0 it is the resting pose.
 */
function drawUprightEar(
  ctx: CanvasRenderingContext2D,
  profile: PetProfile,
  pose: Pose,
  side: number,
  pull: number
): void {
  const coat = profile.uprightCoat!
  ctx.save()
  ctx.translate(side * 15 * (1 - pull * 0.18), -19 + pull * 6)
  ctx.rotate(
    side * (0.18 + (side < 0 ? 0.06 : 0) + pose.earAngle * 0.012 + pull * 2.6)
  )
  ctx.scale(
    (profile.earThicknessScale ?? 1) * (1 + pull * 0.12),
    (profile.earLengthScale ?? 1) * (side < 0 ? 0.94 : 1) * (1 - pull * 0.5)
  )
  const ear = new Path2D()
  ear.moveTo(-7, 4)
  ear.bezierCurveTo(-13, -12, -12, -38, -4, -53)
  ear.bezierCurveTo(-1, -60, 3, -60, 6, -51)
  ear.bezierCurveTo(13, -31, 11, -10, 7, 4)
  ear.closePath()
  shadedFur(
    ctx,
    ear,
    [-12, -58, 24, 62],
    coat.highlight,
    profile.bodyColor,
    coat.shadow,
    profile.accentColor,
    220 + side,
    180
  )
  const inner = new Path2D()
  inner.moveTo(-3, -3)
  inner.bezierCurveTo(-8, -16, -8, -36, -2, -50)
  inner.bezierCurveTo(0, -54, 2, -51, 4, -43)
  inner.bezierCurveTo(8, -25, 6, -11, 3, -3)
  inner.closePath()
  const pink = ctx.createLinearGradient(-7, 0, 7, -5)
  pink.addColorStop(0, rgbCss(coat.innerEar, 0.25))
  pink.addColorStop(0.5, rgbCss(coat.innerEar, 0.9))
  pink.addColorStop(1, rgbCss(coat.innerEar, 0.25))
  ctx.fillStyle = pink
  ctx.fill(inner)
  furTexture(ctx, inner, [-8, -53, 16, 50], coat.highlight, coat.innerEar, 90, 230 + side)
  ctx.strokeStyle = rgbCss(coat.nose, 0.3)
  ctx.lineWidth = 0.6
  ctx.beginPath()
  ctx.moveTo(0, -10)
  ctx.quadraticCurveTo(-2, -28, 0, -42)
  ctx.stroke()
  ctx.restore()
}

/** A broad, low lop with a sandy saddle and darker points, still drawn as a small canvas sprite. */
function drawCoatedLop(ctx: CanvasRenderingContext2D, profile: PetProfile, pose: Pose): void {
  const coat = profile.lopCoat!
  const bodyW = profile.bodyWidthScale ?? 1
  const bodyH = profile.bodyHeightScale ?? 1
  const headS = profile.headScale ?? 1
  const earLength = profile.earLengthScale ?? 1
  const earThickness = profile.earThicknessScale ?? 1
  const feetY = FRAME_ANCHOR_Y - pose.lift
  const bodyY = feetY - 32 * bodyH
  const headY = feetY - 80 - (bodyH - 1) * 20 - (headS - 1) * 10

  if (pose.shadow) {
    ctx.fillStyle = 'rgba(0,0,0,0.18)'
    ctx.beginPath()
    ctx.ellipse(100, FRAME_ANCHOR_Y + 2, 42 * bodyW, 8, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  const bodySx = bodyW * pose.squashX
  const bodySy = bodyH * pose.squashY
  const bodyTransform: Transform = [bodySx, 0, 0, bodySy, 100, bodyY]
  const pawTransforms: Transform[] = [-1, 1].map((side) => [
    side * bodyW, 0, 0, 1, 100 + side * 20 * bodyW, feetY + PAW_DROP
  ])

  for (const side of [-1, 1]) {
    drawPaw(ctx, 100 + side * 20 * bodyW, feetY + PAW_DROP, side, bodyW,
      profile.bodyColor, coat.muzzle, coat.shadow, coat.ticking, coat.toe,
      side > 0 ? profile.earColor ?? coat.shadow : undefined)
  }

  ctx.save()
  ctx.translate(100, bodyY)
  ctx.scale(bodySx, bodySy)
  const body = seatedBodyPath()
  shadedFur(ctx, body, [-46, -34, 92, 65], coat.highlight, profile.bodyColor, coat.shadow, coat.ticking, 17, 600, false)
  // The pale flank is a soft edge in the coat rather than a contrasting belly badge.
  const flank = ctx.createLinearGradient(-42, 0, 0, 0)
  flank.addColorStop(0, 'rgba(222,214,192,0.55)')
  flank.addColorStop(1, 'rgba(222,214,192,0)')
  ctx.fillStyle = flank
  ctx.save()
  ctx.clip(body)
  ctx.fill(ovalPath(-9, 9, 33, 23))
  ctx.restore()
  drawHaunches(ctx, coat.shadow)
  ctx.restore()

  // Body and feet share a single outline so no seam crosses where they meet.
  const outline = rgbCss(shade(coat.shadow, -0.13))
  for (const pawTransform of pawTransforms) {
    strokeClippedOutline(ctx, pawPath(), pawTransform, outline, 1.5, [
      { path: body, transform: bodyTransform }
    ])
  }
  strokeClippedOutline(
    ctx,
    body,
    bodyTransform,
    outline,
    1.5,
    pawTransforms.map((transform) => ({ path: pawPath(), transform }))
  )

  ctx.save()
  ctx.translate(100 + pose.headTurn, headY + pose.headDip)
  ctx.rotate(pose.headTilt)
  ctx.scale(headS, headS)
  // Tanya's loose cream dewlap sits immediately below her cheeks.
  shadedFur(ctx, ovalPath(0, 32, 24, 17), [-24, 15, 48, 34], coat.highlight, profile.accentColor, coat.shadow, profile.bodyColor, 49, 180, false)
  const headShape = ovalPath(0, 0, 30, 28.5)
  shadedFur(ctx, headShape, [-30, -28, 60, 57], coat.highlight, profile.bodyColor, coat.muzzle, coat.ticking, 71, 400)
  // A whisper of warm blush gives her a softer, rounder face.
  for (const side of [-1, 1]) {
    coatPatch(ctx, headShape, side * 22, 15, 13, 10, profile.accentColor, 0.32)
  }

  // A feathered, charcoal-brown mask across the bridge, with lighter cheek pads.
  const mask = ctx.createRadialGradient(0, 8, 2, 0, 7, 19)
  mask.addColorStop(0, rgbCss(coat.muzzle))
  mask.addColorStop(0.55, rgbCss(coat.muzzle, 0.75))
  mask.addColorStop(1, rgbCss(coat.muzzle, 0))
  ctx.fillStyle = mask
  ctx.fill(ovalPath(0, 7, 19, 19))
  for (const side of [-1, 1]) {
    const cheek = ovalPath(side * 7, 16, 11, 8)
    const glow = ctx.createRadialGradient(side * 9, 18, 1, side * 7, 16, 12)
    glow.addColorStop(0, rgbCss(profile.accentColor))
    glow.addColorStop(1, rgbCss(coat.muzzle))
    ctx.fillStyle = glow
    ctx.fill(cheek)
    furTexture(ctx, cheek, [side * 7 - 11, 8, 22, 16], coat.highlight, coat.ticking, 65, 91 + side)
  }

  // The right half of her muzzle carries a soft grey wash.
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, -32, 40, 70)
  ctx.clip()
  coatPatch(ctx, ovalPath(0, 7, 19, 19), 11, 10, 9, 9, profile.earColor ?? coat.shadow, 0.72)
  ctx.restore()

  for (const side of [-1, 1]) {
    const x = side * 17.5
    ctx.strokeStyle = rgbCss(coat.nose)
    ctx.lineWidth = 1.8
    if (pose.eyesClosed) {
      ctx.beginPath()
      ctx.ellipse(x, -2, 5, 2.6, side * -0.15, 0.1 * Math.PI, 0.9 * Math.PI)
      ctx.stroke()
    } else {
      ctx.fillStyle = rgbCss(profile.accentColor)
      ctx.fill(ovalPath(x, -2, 5.8, 6.8))
      ctx.fillStyle = '#292321'
      ctx.fill(ovalPath(x, -2, 4.7, 5.8))
      ctx.fillStyle = '#100f11'
      ctx.fill(ovalPath(x + side * 0.55, -1.5, 3.3, 4.5))
      ctx.fillStyle = '#f5eee4'
      ctx.fill(ovalPath(x - 1.35, -4, 1.5, 1.85))
      ctx.fillStyle = 'rgba(245,238,228,0.65)'
      ctx.fill(ovalPath(x + 1.5, -0.6, 0.75, 0.85))
    }
  }

  for (const side of [-1, 1]) {
    // While grooming, one ear is hooked and dragged across the muzzle.
    const pull = side === pose.groomEarSide ? pose.groomEarPull : 0
    ctx.save()
    ctx.translate(side * 21 * (1 - pull * 0.12), -22 + pull * 4)
    ctx.rotate(side * (-0.025 + pose.earAngle * 0.009 + pull * 0.66) + (side < 0 ? -0.035 : 0.025))
    ctx.scale(side * earThickness, earLength * (side < 0 ? 0.97 : 1) * (1 - pull * 0.22))
    const ear = new Path2D()
    // Rise from the crown, fold outwards, then broaden into a hanging ear blade.
    ear.moveTo(-6, 3)
    ear.bezierCurveTo(-8, -5, -1, -9, 6, -5)
    ear.bezierCurveTo(16, 0, 18, 13, 19, 25)
    ear.bezierCurveTo(21, 37, 21, 49, 17, 56)
    ear.bezierCurveTo(14, 63, 6, 65, 2, 59)
    ear.bezierCurveTo(-3, 53, -3, 42, -1, 30)
    ear.bezierCurveTo(1, 19, 2, 10, -6, 3)
    ear.closePath()
    const earBase = profile.earColor ?? coat.shadow
    const isRightEar = side > 0
    // Both ears share the right ear's warm highlight; the right ear's own coat
    // is almost pure base brown (far less grey) while keeping its dapples.
    const earLight = profile.bodyColor
    const earMid = isRightEar ? profile.bodyColor : earBase
    const earShadow = isRightEar ? shade(profile.bodyColor, -0.2) : coat.shadow
    shadedFur(ctx, ear, [-8, -8, 30, 73], earLight, earMid, earShadow, coat.ticking, 110 + side, 230)
    ctx.save()
    ctx.clip(ear)
    // Broken warm patches dapple the ears, with asymmetric but stable placement.
    for (let i = 0; i < 18; i += 1) {
      const x = 4 + Math.sin(i * 2.4 + side) * 8
      const y = 5 + i * 2.9
      const patch = ctx.createRadialGradient(x, y, 0, x, y, 5)
      patch.addColorStop(0, 'rgba(190,160,116,0.3)')
      patch.addColorStop(1, 'rgba(190,160,116,0)')
      ctx.fillStyle = patch
      ctx.fillRect(x - 5, y - 5, 10, 10)
    }
    // A faint lengthwise fold gives the soft ear thickness and a turned inner edge.
    const fold = ctx.createLinearGradient(0, 6, 0, 57)
    fold.addColorStop(0, rgbCss(coat.ticking, 0))
    fold.addColorStop(0.35, rgbCss(coat.ticking, 0.38))
    fold.addColorStop(1, rgbCss(coat.ticking, 0))
    ctx.strokeStyle = fold
    ctx.lineWidth = 1.4
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(5, 7)
    ctx.bezierCurveTo(11, 20, 5, 43, 8, 56)
    ctx.stroke()
    ctx.restore()
    ctx.restore()
  }

  ctx.fillStyle = rgbCss(coat.nose)
  ctx.beginPath()
  ctx.moveTo(-4, 11)
  ctx.quadraticCurveTo(0, 9, 4, 11)
  ctx.quadraticCurveTo(2, 15, 0, 15)
  ctx.quadraticCurveTo(-2, 15, -4, 11)
  ctx.fill()
  ctx.strokeStyle = rgbCss(coat.nose)
  ctx.lineWidth = 0.9
  ctx.beginPath()
  ctx.moveTo(0, 14)
  ctx.lineTo(0, 18)
  ctx.quadraticCurveTo(-3, 21, -6, 19)
  ctx.moveTo(0, 18)
  ctx.quadraticCurveTo(3, 21, 6, 19)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(226,216,196,0.55)'
  ctx.lineWidth = 0.55
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath()
      ctx.moveTo(side * 11, 15 + i * 2)
      ctx.quadraticCurveTo(side * 23, 13 + i * 3, side * 33, 10 + i * 5)
      ctx.stroke()
    }
  }
  drawGroomingPaws(ctx, pose, coat.highlight, profile.bodyColor, coat.shadow, coat.ticking, 5, 22, coat.toe)
  drawGroomTongue(ctx, pose)
  ctx.restore()
}

/** Soft-edged pigment stays clipped to the fur, including during head and body motion. */
function coatPatch(
  ctx: CanvasRenderingContext2D,
  silhouette: Path2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  color: number,
  opacity: number
): void {
  ctx.save()
  ctx.clip(silhouette)
  ctx.translate(x, y)
  ctx.scale(rx, ry)
  const gradient = ctx.createRadialGradient(0, 0, 0.1, 0, 0, 1)
  gradient.addColorStop(0, rgbCss(color, opacity))
  gradient.addColorStop(0.5, rgbCss(color, opacity * 0.65))
  gradient.addColorStop(1, rgbCss(color, 0))
  ctx.fillStyle = gradient
  ctx.fill(ovalPath(0, 0, 1, 1))
  ctx.restore()
}

/** Upright ears, a tapered forehead and full white cheeks distinguish Taco's silhouette. */
function drawCoatedUpright(ctx: CanvasRenderingContext2D, profile: PetProfile, pose: Pose): void {
  const coat = profile.uprightCoat!
  const bodyW = profile.bodyWidthScale ?? 1
  const bodyH = profile.bodyHeightScale ?? 1
  const headS = profile.headScale ?? 1
  const feetY = FRAME_ANCHOR_Y - pose.lift
  // Keep room above the tall ears for the full hop arc inside the shared frame.
  const headY = feetY - 69

  if (pose.shadow) {
    ctx.fillStyle = 'rgba(0,0,0,0.18)'
    ctx.fill(ovalPath(100, FRAME_ANCHOR_Y + 2, 40 * bodyW, 8))
  }
  const bodySx = bodyW * pose.squashX
  const bodySy = bodyH * pose.squashY
  const bodyTransform: Transform = [bodySx, 0, 0, bodySy, 100, feetY - 32 * bodyH]
  const pawTransforms: Transform[] = [-1, 1].map((side) => [
    side * bodyW, 0, 0, 1, 100 + side * 22 * bodyW, feetY + PAW_DROP
  ])

  for (const side of [-1, 1]) {
    drawPaw(ctx, 100 + side * 22 * bodyW, feetY + PAW_DROP, side, bodyW,
      coat.highlight, profile.bodyColor, coat.shadow, profile.accentColor)
  }

  ctx.save()
  ctx.translate(100, feetY - 32 * bodyH)
  ctx.scale(bodySx, bodySy)
  const body = seatedBodyPath()
  shadedFur(ctx, body, [-46, -34, 92, 65], coat.highlight, profile.bodyColor, coat.shadow, profile.accentColor, 201, 650, false)
  // The photos show a faint silver saddle on the rear flank, not an overall grey coat.
  coatPatch(ctx, body, -35, -6, 15, 26, coat.marking, 0.6)
  coatPatch(ctx, body, 32, -18, 13, 13, coat.marking, 0.22)
  furTexture(ctx, body, [-45, -32, 90, 64], coat.highlight, profile.accentColor, 300, 202)
  drawHaunches(ctx, coat.shadow)
  ctx.restore()

  // Body and feet share a single outline so no seam crosses where they meet.
  const outline = rgbCss(shade(coat.shadow, -0.13))
  for (const pawTransform of pawTransforms) {
    strokeClippedOutline(ctx, pawPath(), pawTransform, outline, 1.5, [
      { path: body, transform: bodyTransform }
    ])
  }
  strokeClippedOutline(
    ctx,
    body,
    bodyTransform,
    outline,
    1.5,
    pawTransforms.map((transform) => ({ path: pawPath(), transform }))
  )

  ctx.save()
  ctx.translate(100 + pose.headTurn, headY + pose.headDip)
  ctx.rotate(pose.headTilt)
  ctx.scale(headS, headS)
  // Ears sit behind the head unless one is being folded forward to the mouth.
  const pulledEar = pose.groomEarPull > 0.01 ? pose.groomEarSide : 0
  for (const side of [-1, 1] as const) {
    if (side !== pulledEar) drawUprightEar(ctx, profile, pose, side, 0)
  }

  shadedFur(ctx, ovalPath(0, 29, 25, 16), [-25, 13, 50, 32], coat.highlight, profile.bodyColor, coat.shadow, profile.accentColor, 241, 160, false)
  const head = new Path2D()
  head.moveTo(0, -29)
  head.bezierCurveTo(21, -30, 25, -13, 29, 1)
  head.bezierCurveTo(37, 20, 22, 32, 0, 31)
  head.bezierCurveTo(-22, 32, -37, 20, -29, 1)
  head.bezierCurveTo(-25, -13, -21, -30, 0, -29)
  shadedFur(ctx, head, [-33, -30, 66, 63], coat.highlight, profile.bodyColor, coat.shadow, profile.accentColor, 251, 380)
  // A silver arc tracing the ear roots from ten o'clock to noon.
  const crownRadius = 23
  for (let i = 0; i < 9; i += 1) {
    const angle = -Math.PI * (5 / 6) + (i / 8) * (Math.PI / 3)
    const x = Math.cos(angle) * crownRadius
    const y = Math.sin(angle) * crownRadius + 8
    coatPatch(ctx, head, x, y, 4, 3.2, coat.marking, 0.42)
  }
  for (const side of [-1, 1]) {
    coatPatch(ctx, head, side * 23, -3, 9, 11, coat.marking, side < 0 ? 0.34 : 0.48)
  }
  furTexture(ctx, head, [-33, -30, 66, 63], coat.highlight, profile.accentColor, 210, 252)

  // A soft warm blush under each cheek reads younger without altering the coat.
  for (const side of [-1, 1]) {
    coatPatch(ctx, head, side * 25, 15, 14, 11, coat.innerEar, 0.3)
  }

  for (const side of [-1, 1]) {
    const x = side * 19.5
    ctx.save()
    ctx.translate(x, 0)
    ctx.rotate(side * 0.16)
    if (pose.eyesClosed) {
      ctx.strokeStyle = rgbCss(shade(coat.iris, -0.2))
      ctx.lineWidth = 1.7
      ctx.beginPath()
      ctx.ellipse(0, 0, 5.2, 2.8, 0, Math.PI * 0.1, Math.PI * 0.9)
      ctx.stroke()
    } else {
      ctx.fillStyle = '#41474e'
      ctx.fill(ovalPath(0, 0, 6, 7.1))
      const iris = ctx.createLinearGradient(0, -6, 0, 6)
      iris.addColorStop(0, rgbCss(shade(coat.iris, -0.15)))
      iris.addColorStop(0.65, rgbCss(coat.iris))
      iris.addColorStop(1, rgbCss(shade(coat.iris, 0.13)))
      ctx.fillStyle = iris
      ctx.fill(ovalPath(0, 0, 5.1, 6.1))
      ctx.fillStyle = '#151c25'
      ctx.fill(ovalPath(side * 0.4, -0.3, 3.25, 4.4))
      ctx.fillStyle = 'rgba(255,255,255,0.95)'
      ctx.fill(ovalPath(-1.7, -3, 1.7, 2))
      ctx.fillStyle = 'rgba(255,255,255,0.7)'
      ctx.fill(ovalPath(1.7, -1.1, 0.8, 0.9))
      ctx.fillStyle = 'rgba(224,237,247,0.55)'
      ctx.fill(ovalPath(1.8, 3.2, 0.9, 0.95))
    }
    ctx.restore()
  }

  // The white muzzle blends into the cheeks, with just a muted pink nose and mouth.
  for (const side of [-1, 1]) {
    coatPatch(ctx, head, side * 9, 18, 15, 11, coat.highlight, 0.9)
    furTexture(ctx, ovalPath(side * 8, 18, 11, 8), [side * 8 - 11, 10, 22, 16], coat.highlight, profile.accentColor, 65, 260 + side)
  }
  ctx.fillStyle = rgbCss(coat.nose, 0.85)
  ctx.beginPath()
  ctx.moveTo(-4, 13)
  ctx.quadraticCurveTo(0, 12, 4, 13)
  ctx.quadraticCurveTo(2, 16, 0, 16)
  ctx.quadraticCurveTo(-2, 16, -4, 13)
  ctx.fill()
  ctx.strokeStyle = rgbCss(shade(coat.nose, -0.18), 0.8)
  ctx.lineWidth = 0.8
  ctx.beginPath()
  ctx.moveTo(0, 16)
  ctx.lineTo(0, 20)
  ctx.quadraticCurveTo(-3, 23, -6, 21)
  ctx.moveTo(0, 20)
  ctx.quadraticCurveTo(3, 23, 6, 21)
  ctx.stroke()
  ctx.lineWidth = 0.6
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i += 1) {
      ctx.strokeStyle = rgbCss(i % 2 === 0 ? coat.highlight : coat.shadow, 0.7)
      ctx.beginPath()
      ctx.moveTo(side * 12, 16 + i * 1.5)
      ctx.quadraticCurveTo(side * 27, 9 + i * 4, side * (38 - i), 7 + i * 5)
      ctx.stroke()
    }
  }
  // The hooked ear folds forward over the cheek, so it draws after the face.
  if (pulledEar !== 0) drawUprightEar(ctx, profile, pose, pulledEar, pose.groomEarPull)
  drawGroomingPaws(ctx, pose, coat.highlight, profile.bodyColor, coat.shadow, profile.accentColor, 20, 9, coat.innerEar)
  drawGroomTongue(ctx, pose)
  ctx.restore()
}

function drawFrame(
  profile: PetProfile,
  clip: string,
  index: number,
  count: number
): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = FRAME_SIZE * SPRITE_SUPERSAMPLE
  canvas.height = FRAME_SIZE * SPRITE_SUPERSAMPLE
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas
  ctx.scale(SPRITE_SUPERSAMPLE, SPRITE_SUPERSAMPLE)

  const pose = poseFor(clip, index, count)
  const spinning = pose.spin !== 0
  if (spinning) {
    // Rotate the whole bunny about its body centre so the binkie reads as a
    // mid-air twist without swinging around its feet.
    const pivotY = FRAME_ANCHOR_Y - pose.lift - 65
    ctx.save()
    ctx.translate(FRAME_ANCHOR_X, pivotY)
    ctx.rotate(pose.spin)
    ctx.translate(-FRAME_ANCHOR_X, -pivotY)
  }
  if (!profile.lopEars && profile.uprightCoat) {
    drawCoatedUpright(ctx, profile, pose)
    if (spinning) ctx.restore()
    return canvas
  }
  if (profile.lopEars && profile.lopCoat) {
    drawCoatedLop(ctx, profile, pose)
    if (spinning) ctx.restore()
    return canvas
  }
  const body = profile.bodyColor
  const accent = profile.accentColor
  const ear = profile.earColor ?? body
  const dark = shade(body, -0.28)
  const bodyW = profile.bodyWidthScale ?? 1
  const bodyH = profile.bodyHeightScale ?? 1
  const headS = profile.headScale ?? 1
  const earLength = profile.earLengthScale ?? 1
  const earThickness = profile.earThicknessScale ?? 1

  const feetY = FRAME_ANCHOR_Y - pose.lift
  const bodyCX = FRAME_SIZE / 2
  const bodyCY = feetY - 34 * bodyH
  const headCX = bodyCX + pose.headTurn
  const headCY = feetY - 80 - (bodyH - 1) * 20 - (headS - 1) * 10 + pose.headDip

  const earSway = pose.earAngle * 0.015

  if (pose.shadow) {
    ctx.fillStyle = 'rgba(0,0,0,0.18)'
    ctx.beginPath()
    ctx.ellipse(bodyCX, FRAME_ANCHOR_Y + 2, 42 * bodyW, 9, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.fillStyle = '#000000'
  if (profile.lopEars) {
    ctx.beginPath()
    addLopEarPath(ctx, headCX, headCY, -1, headS, earSway, OUTLINE_WIDTH, earLength, earThickness)
    ctx.fill()
    ctx.beginPath()
    addLopEarPath(ctx, headCX, headCY, 1, headS, earSway, OUTLINE_WIDTH, earLength, earThickness)
    ctx.fill()
  } else {
    ctx.beginPath()
    addEarPath(ctx, headCX - 12 * headS, headCY - 18 * headS, -0.22 + pose.earAngle * 0.02, headS, OUTLINE_WIDTH, earLength, earThickness)
    ctx.fill()
    ctx.beginPath()
    addEarPath(ctx, headCX + 12 * headS, headCY - 18 * headS, 0.22 + pose.earAngle * 0.02, headS, OUTLINE_WIDTH, earLength, earThickness)
    ctx.fill()
  }
  ctx.beginPath()
  ctx.ellipse(
    bodyCX,
    bodyCY,
    44 * bodyW * pose.squashX + OUTLINE_WIDTH,
    34 * bodyH * pose.squashY + OUTLINE_WIDTH,
    0,
    0,
    Math.PI * 2
  )
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(bodyCX - 20 * bodyW, feetY - 6, 12 * bodyW + OUTLINE_WIDTH, 7 + OUTLINE_WIDTH, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(bodyCX + 20 * bodyW, feetY - 6, 12 * bodyW + OUTLINE_WIDTH, 7 + OUTLINE_WIDTH, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(headCX, headCY, 28 * headS + OUTLINE_WIDTH, 0, Math.PI * 2)
  ctx.fill()

  if (!profile.lopEars) {
    drawEar(ctx, headCX - 12 * headS, headCY - 18 * headS, -0.22 + pose.earAngle * 0.02, ear, accent, headS, earLength, earThickness)
    drawEar(ctx, headCX + 12 * headS, headCY - 18 * headS, 0.22 + pose.earAngle * 0.02, ear, accent, headS, earLength, earThickness)
  }

  ctx.fillStyle = rgbCss(body)
  ctx.beginPath()
  ctx.ellipse(bodyCX, bodyCY, 44 * bodyW * pose.squashX, 34 * bodyH * pose.squashY, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = rgbCss(accent)
  ctx.beginPath()
  ctx.ellipse(
    bodyCX,
    bodyCY + 8,
    26 * bodyW * pose.squashX,
    20 * bodyH * pose.squashY,
    0,
    0,
    Math.PI * 2
  )
  ctx.fill()

  ctx.beginPath()
  ctx.ellipse(bodyCX - 20 * bodyW, feetY - 6, 12 * bodyW, 7, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(bodyCX + 20 * bodyW, feetY - 6, 12 * bodyW, 7, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = rgbCss(body)
  ctx.beginPath()
  ctx.arc(headCX, headCY, 28 * headS, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = rgbCss(accent)
  ctx.beginPath()
  ctx.ellipse(headCX, headCY + 12 * headS, 15 * headS, 11 * headS, 0, 0, Math.PI * 2)
  ctx.fill()

  if (pose.eyesClosed) {
    ctx.strokeStyle = rgbCss(dark)
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.arc(headCX - 10 * headS, headCY - 2 * headS, 4 * headS, 0.15 * Math.PI, 0.85 * Math.PI)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(headCX + 10 * headS, headCY - 2 * headS, 4 * headS, 0.15 * Math.PI, 0.85 * Math.PI)
    ctx.stroke()
  } else {
    ctx.fillStyle = '#1c1c22'
    ctx.beginPath()
    ctx.arc(headCX - 10 * headS, headCY - 2 * headS, 4.5 * headS, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(headCX + 10 * headS, headCY - 2 * headS, 4.5 * headS, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.9)'
    ctx.beginPath()
    ctx.arc(headCX - 11.5 * headS, headCY - 3.5 * headS, 1.6 * headS, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(headCX + 8.5 * headS, headCY - 3.5 * headS, 1.6 * headS, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.fillStyle = '#e79aa8'
  ctx.beginPath()
  ctx.ellipse(headCX, headCY + 8 * headS, 4 * headS, 3 * headS, 0, 0, Math.PI * 2)
  ctx.fill()

  if (profile.lopEars) {
    drawLopEar(ctx, headCX, headCY, -1, headS, ear, earSway, earLength, earThickness)
    drawLopEar(ctx, headCX, headCY, 1, headS, ear, earSway, earLength, earThickness)
  }

  if (spinning) ctx.restore()

  return canvas
}

export function createPlaceholderSpriteSet(profile: PetProfile): PetSpriteSet {
  const textures: Record<string, Texture[]> = {}

  for (const [clip, definition] of Object.entries(animationClips)) {
    textures[clip] = lazyFrames(definition.frames, (i) => {
      const source = new CanvasSource({
        resource: drawFrame(profile, clip, i, definition.frames),
        resolution: SPRITE_SUPERSAMPLE
      })
      return new Texture({ source })
    })
  }

  return {
    textures,
    anchorX: FRAME_ANCHOR_X,
    anchorY: FRAME_ANCHOR_Y,
    frameWidth: FRAME_SIZE,
    frameHeight: FRAME_SIZE
  }
}
