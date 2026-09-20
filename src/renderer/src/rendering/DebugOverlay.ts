import { Application, Graphics } from 'pixi.js'
import type { FoodItem } from '../food/FoodItem'
import type { Pet, PetId } from '../pets/Pet'
import type { PetState } from '../pets/PetState'
import type { ScreenBounds } from '../movement/screenBounds'
import { getWeightedTransitions } from '../behaviour/transitions'
import type { WorldContext } from '../behaviour/WorldContext'
import { animationMap } from './spriteAnimations'

export type DebugTriggerHandler = (petId: PetId, state: PetState) => void

const TRIGGER_STATES = Object.keys(animationMap) as PetState[]

interface TriggerButton {
  petId: PetId
  state: PetState
  element: HTMLButtonElement
}

export class DebugOverlay {
  private readonly graphics = new Graphics()
  private readonly panel = document.createElement('div')
  private readonly stats = document.createElement('div')
  private readonly controls = document.createElement('div')
  private readonly buttons: TriggerButton[] = []
  private enabled = false
  private builtFor = ''

  constructor(
    app: Application,
    private readonly onTrigger?: DebugTriggerHandler
  ) {
    app.stage.addChild(this.graphics)

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
      pointerEvents: 'auto',
      display: 'none',
      maxWidth: '560px',
      zIndex: '10'
    })
    Object.assign(this.stats.style, { whiteSpace: 'pre', pointerEvents: 'none' })
    Object.assign(this.controls.style, {
      marginTop: '8px',
      paddingTop: '8px',
      borderTop: '1px solid rgba(120, 200, 255, 0.25)',
      display: 'grid',
      gap: '6px'
    })

    this.panel.append(this.stats, this.controls)
    // A press on a control must not also register as a click on a pet below it.
    for (const type of ['pointerdown', 'pointerup', 'dblclick'] as const) {
      this.panel.addEventListener(type, (event) => event.stopPropagation())
    }
    document.body.appendChild(this.panel)
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled
    this.panel.style.display = enabled ? 'block' : 'none'
    if (!enabled) this.graphics.clear()
  }

  /** True while the pointer is over the panel, so the window can accept clicks. */
  containsPoint(x: number, y: number): boolean {
    if (!this.enabled) return false
    const rect = this.panel.getBoundingClientRect()
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
  }

  private buildControls(pets: Pet[]): void {
    this.controls.textContent = ''
    this.buttons.length = 0

    for (const pet of pets) {
      const row = document.createElement('div')
      Object.assign(row.style, {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '4px',
        alignItems: 'center'
      })

      const label = document.createElement('span')
      label.textContent = pet.profile.displayName
      Object.assign(label.style, { color: '#9fd8ff', width: '44px' })
      row.appendChild(label)

      for (const state of TRIGGER_STATES) {
        const element = document.createElement('button')
        element.type = 'button'
        element.tabIndex = -1
        element.textContent = state
        Object.assign(element.style, {
          font: 'inherit',
          color: '#e8f8ff',
          background: 'rgba(40, 70, 100, 0.85)',
          border: '1px solid rgba(120, 200, 255, 0.4)',
          borderRadius: '4px',
          padding: '1px 5px',
          cursor: 'pointer'
        })
        element.addEventListener('click', () => this.onTrigger?.(pet.id, state))
        row.appendChild(element)
        this.buttons.push({ petId: pet.id, state, element })
      }

      this.controls.appendChild(row)
    }
  }

  update(
    pets: Pet[],
    bounds: ScreenBounds,
    scale: number,
    food: FoodItem[] = [],
    ctx?: WorldContext
  ): void {
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

    const ids = pets.map((pet) => pet.id).join(',')
    if (ids !== this.builtFor) {
      this.buildControls(pets)
      this.builtFor = ids
    }
    for (const button of this.buttons) {
      const pet = pets.find((candidate) => candidate.id === button.petId)
      const active = pet?.state === button.state
      button.element.style.background = active
        ? 'rgba(90, 160, 220, 0.95)'
        : 'rgba(40, 70, 100, 0.85)'
      button.element.style.borderColor = active
        ? 'rgba(180, 230, 255, 0.95)'
        : 'rgba(120, 200, 255, 0.4)'
    }

    this.stats.textContent = pets
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
        const triggers = ctx ? getWeightedTransitions(pet, ctx) : []
        const triggerLines = triggers.length
          ? triggers
              .slice()
              .sort((a, b) => b.weight - a.weight)
              .map((trigger) => `    ${trigger.state} ${trigger.weight.toFixed(2)}`)
          : ['    (none)']
        return [
          pet.profile.displayName,
          `  state: ${pet.state}`,
          `  x: ${pet.position.x.toFixed(0)}`,
          `  target x: ${target}${companion}`,
          `  facing: ${pet.facing}`,
          `  pointer: ${pointerFlags || 'none'}`,
          '  triggers:',
          ...triggerLines
        ].join('\n')
      })
      .join('\n\n')
  }
}
