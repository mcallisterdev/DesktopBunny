import { Application, Container, Graphics } from 'pixi.js'
import type { FoodItem } from '../food/FoodItem'

const LEAVES: Array<{ x: number; y: number; rx: number; ry: number; color: number }> = [
  { x: 0, y: -34, rx: 17, ry: 20, color: 0x3f7a2e },
  { x: -15, y: -26, rx: 14, ry: 16, color: 0x4f8f38 },
  { x: 15, y: -26, rx: 14, ry: 16, color: 0x4f8f38 },
  { x: -9, y: -44, rx: 12, ry: 14, color: 0x5aa03f },
  { x: 9, y: -44, rx: 12, ry: 14, color: 0x5aa03f },
  { x: 0, y: -22, rx: 12, ry: 12, color: 0x2f5f22 }
]

export class FoodRenderer {
  private readonly layer = new Container()
  private readonly entries = new Map<number, Graphics>()

  constructor(app: Application) {
    app.stage.addChild(this.layer)
  }

  update(food: FoodItem[]): void {
    const seen = new Set<number>()

    for (const item of food) {
      seen.add(item.id)
      let entry = this.entries.get(item.id)
      if (!entry) {
        entry = createKale()
        this.layer.addChild(entry)
        this.entries.set(item.id, entry)
      }
      entry.x = item.position.x
      entry.y = item.position.y
      entry.scale.set(0.6 + item.bites * 0.13)
    }

    for (const [id, entry] of this.entries) {
      if (seen.has(id)) continue
      entry.destroy()
      this.entries.delete(id)
    }
  }
}

function createKale(): Graphics {
  const g = new Graphics()
  g.ellipse(0, 0, 26, 6).fill({ color: 0x000000, alpha: 0.18 })
  g.roundRect(-3, -24, 6, 24, 3).fill(0x6b8f3a)
  for (const leaf of LEAVES) {
    g.ellipse(leaf.x, leaf.y, leaf.rx, leaf.ry).fill(leaf.color)
  }
  g.ellipse(0, -34, 6, 8).fill({ color: 0xc6e0a0, alpha: 0.5 })
  return g
}
