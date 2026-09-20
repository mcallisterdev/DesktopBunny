import { Application, Graphics } from 'pixi.js'
import type { FoodItem } from '../food/FoodItem'
import type { Pet } from '../pets/Pet'
import type { ScreenBounds } from '../movement/screenBounds'

export class DebugOverlay {
  private readonly graphics = new Graphics()
  private readonly panel: HTMLDivElement
  private enabled = false

  constructor(app: Application) {
    app.stage.addChild(this.graphics)
    this.panel = document.createElement('div')
    Object.assign(this.panel.style, {
      position: 'fixed',
      top: '8px',
      left: '8px',
      padding: '8px 10px',
      font: '11px/1.5 Consolas, Menlo, monospace',
      color: '#e8f8ff',
      background: 'rgba(10, 14, 20, 0.72)',
      border: '1px solid rgba(120, 200, 255, 0.35)',
      borderRadius: '6px',
      whiteSpace: 'pre',
      pointerEvents: 'none',
      display: 'none',
      zIndex: '10'
    })
    document.body.appendChild(this.panel)
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled
    this.panel.style.display = enabled ? 'block' : 'none'
    if (!enabled) this.graphics.clear()
  }

  update(pets: Pet[], bounds: ScreenBounds, scale: number, food: FoodItem[] = []): void {
    if (!this.enabled) return

    this.graphics.clear()
    this.graphics
      .moveTo(0, bounds.floorY)
      .lineTo(bounds.width, bounds.floorY)
      .stroke({ width: 1, color: 0x44ff88, alpha: 0.5 })

    for (const item of food) {
      this.graphics
        .circle(item.position.x, item.position.y, 6)
        .stroke({ width: 1, color: 0x88dd44, alpha: 0.9 })
    }

    for (const pet of pets) {
      const width = pet.profile.hitboxWidth * scale
      const height = pet.profile.hitboxHeight * scale
      this.graphics
        .rect(pet.position.x - width / 2, pet.position.y - height, width, height)
        .stroke({ width: 1, color: 0xffaa00, alpha: 0.7 })

      if (pet.targetPosition) {
        this.graphics
          .circle(pet.targetPosition.x, pet.targetPosition.y, 5)
          .fill({ color: 0x00aaff, alpha: 0.85 })
      }
    }

    this.panel.textContent = pets
      .map((pet) => {
        const target = pet.targetPosition ? pet.targetPosition.x.toFixed(0) : 'none'
        const companion = pet.targetPetId ? ` (${pet.targetPetId})` : ''
        const pointerFlags = [
          pet.pointer.hovered ? 'hover' : '',
          pet.pointer.dragging ? 'drag' : '',
          pet.pointer.petting ? 'pet' : ''
        ]
          .filter(Boolean)
          .join('+')
        return [
          pet.profile.displayName,
          `  state: ${pet.state}`,
          `  x: ${pet.position.x.toFixed(0)}`,
          `  target x: ${target}${companion}`,
          `  facing: ${pet.facing}`,
          `  pointer: ${pointerFlags || 'none'}`
        ].join('\n')
      })
      .join('\n\n')
  }
}
