import { Container, Graphics } from 'pixi.js'
import type { PetProfile } from '../pets/PetProfile'

export const PARACHUTE_SWAY_PERIOD_MS = 2300

/** The origin is the harness attachment, so swaying never disconnects the ropes. */
export interface ParachuteVisual {
  view: Container
  harnessY: number
}

const OUTLINE = 0x997465
const CORD = 0xc5ac91
const CREAM = 0xfff2dc
const PANEL_COLORS = [0xd99586, 0xffe6c9, 0xf4b3a0, 0xfff2dc, 0xeaa28f, 0xe4c7ad]

export function createParachute(profile: PetProfile): ParachuteVisual {
  const height = profile.hitboxHeight
  const harnessY = -height * 0.52
  const canopyY = -(height + 30) - harnessY
  const radius = Math.max(42, profile.hitboxWidth * 0.65)
  const domeTop = canopyY - radius * 0.78
  const view = new Container()
  const g = new Graphics()
  const edges = [-1, -0.78, -0.42, 0, 0.42, 0.78, 1]
  const rimY = (u: number): number => canopyY + radius * 0.09 * (1 - u * u)

  // Two risers spread the load across the harness instead of meeting in a knot.
  for (const u of edges) {
    const attachmentX = u < 0 ? -7 : 7
    g.moveTo(u * radius, rimY(u))
    g.lineTo(attachmentX, -3)
  }
  g.stroke({ width: 1.65, color: OUTLINE, alpha: 0.55 })
  for (const u of edges) {
    g.moveTo(u * radius, rimY(u))
    g.lineTo(u < 0 ? -7 : 7, -3)
  }
  g.stroke({ width: 0.8, color: CREAM, alpha: 0.95 })

  // A shadowed opening gives the inflated fabric a visible underside.
  g.ellipse(0, canopyY + 2, radius, radius * 0.115)
    .fill({ color: 0xb87e70 })

  // Each gore shares its curved seams with its neighbours. The outer seams
  // form the dome itself, keeping every seam inside the fabric silhouette.
  for (let i = 0; i < edges.length - 1; i += 1) {
    const left = edges[i]
    const right = edges[i + 1]
    const mid = (left + right) / 2
    g.moveTo(0, domeTop)
    g.bezierCurveTo(
      left * radius * 0.6, domeTop,
      left * radius, domeTop + radius * 0.29,
      left * radius, rimY(left)
    )
    g.quadraticCurveTo(mid * radius, rimY(mid) + radius * 0.075, right * radius, rimY(right))
    g.bezierCurveTo(
      right * radius, domeTop + radius * 0.29,
      right * radius * 0.6, domeTop,
      0, domeTop
    )
    g.closePath().fill({ color: PANEL_COLORS[i] })
    g.stroke({ width: 0.9, color: OUTLINE, alpha: 0.5 })

    // A narrow rolled hem follows the scallop rather than floating below it.
    g.moveTo(left * radius, rimY(left))
    g.quadraticCurveTo(mid * radius, rimY(mid) + radius * 0.075, right * radius, rimY(right))
    g.stroke({ width: 2.8, color: CREAM })
    g.moveTo(left * radius, rimY(left) + 1.5)
    g.quadraticCurveTo(mid * radius, rimY(mid) + radius * 0.075 + 1.5, right * radius, rimY(right) + 1.5)
    g.stroke({ width: 0.7, color: OUTLINE, alpha: 0.5 })
  }

  // Soft curved highlights suggest tension and light across the crown.
  for (const u of [-0.78, -0.42, 0.42]) {
    g.moveTo(u * radius * 0.36, domeTop + radius * 0.09)
    g.bezierCurveTo(
      u * radius * 0.77, domeTop + radius * 0.16,
      u * radius * 0.91, domeTop + radius * 0.35,
      u * radius * 0.93, canopyY - radius * 0.17
    )
    g.stroke({ width: 2, color: 0xffffff, alpha: 0.23 })
  }

  // A tiny stitched heart keeps the soft toy character without obscuring the shape.
  const heartY = domeTop + radius * 0.42
  g.moveTo(0, heartY + 9)
    .bezierCurveTo(-15, heartY, -6, heartY - 8, 0, heartY - 2)
    .bezierCurveTo(6, heartY - 8, 15, heartY, 0, heartY + 9)
    .closePath().fill({ color: 0xd88e83 })
    .stroke({ width: 1, color: CREAM, alpha: 0.9 })

  // Fabric crown cap and a padded little harness loop.
  g.ellipse(0, domeTop + 0.8, 4, 1.8).fill({ color: CREAM })
  g.moveTo(-7, -5).quadraticCurveTo(0, 5, 7, -5)
    .stroke({ width: 4, color: OUTLINE })
  g.moveTo(-7, -5).quadraticCurveTo(0, 5, 7, -5)
    .stroke({ width: 2.3, color: CORD })

  view.addChild(g)
  return { view, harnessY }
}
