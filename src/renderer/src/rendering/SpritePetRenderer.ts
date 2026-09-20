import { Application, Container, Graphics, Sprite } from 'pixi.js'
import type { Pet } from '../pets/Pet'
import type { IPetRenderer } from './IPetRenderer'
import { animationClips, animationMap } from './spriteAnimations'
import { createPlaceholderSpriteSet, FRAME_SIZE, type PetSpriteSet } from './PlaceholderSprites'
import { createParachute, PARACHUTE_SWAY_PERIOD_MS, type ParachuteVisual } from './Parachute'

interface PetEntry {
  container: Container
  sprite: Sprite
  parachute: ParachuteVisual
  chuteElapsedMs: number
  debug: Graphics
  set: PetSpriteSet
  clip: string
  frameIndex: number
  frameElapsedMs: number
  hitboxWidth: number
  hitboxHeight: number
}

export class SpritePetRenderer implements IPetRenderer {
  private readonly layer = new Container()
  private readonly entries = new Map<string, PetEntry>()
  private scale = 1
  private debug = false

  constructor(private readonly app: Application) {
    this.layer.sortableChildren = true
    this.app.stage.addChild(this.layer)
  }

  createPet(pet: Pet): void {
    const set = createPlaceholderSpriteSet(pet.profile)

    const container = new Container()
    container.zIndex = pet.profile.renderOrder ?? 0

    const parachute = createParachute(pet.profile)
    parachute.view.visible = false
    container.addChild(parachute.view)

    const sprite = new Sprite(set.textures[animationMap[pet.state]][0])
    sprite.anchor.set(set.anchorX / FRAME_SIZE, set.anchorY / FRAME_SIZE)
    container.addChild(sprite)

    const debug = new Graphics()
    container.addChild(debug)

    this.layer.addChild(container)
    this.entries.set(pet.id, {
      container,
      sprite,
      parachute,
      chuteElapsedMs: 0,
      debug,
      set,
      clip: animationMap[pet.state],
      frameIndex: 0,
      frameElapsedMs: 0,
      hitboxWidth: pet.profile.hitboxWidth,
      hitboxHeight: pet.profile.hitboxHeight
    })
  }

  updatePet(pet: Pet, deltaMs: number): void {
    const entry = this.entries.get(pet.id)
    if (!entry) return

    const baseScale = pet.profile.baseScale * this.scale
    entry.container.x = pet.position.x
    entry.container.y = pet.position.y
    entry.sprite.scale.set(baseScale)

    this.updateParachute(entry, pet.state === 'parachute', baseScale, deltaMs)

    const clip = animationMap[pet.state]
    if (clip !== entry.clip) {
      entry.clip = clip
      entry.frameIndex = 0
      entry.frameElapsedMs = 0
    }

    const definition = animationClips[clip]
    if (definition) {
      entry.frameElapsedMs += deltaMs
      const frameDuration = 1000 / definition.fps
      while (entry.frameElapsedMs >= frameDuration) {
        entry.frameElapsedMs -= frameDuration
        entry.frameIndex = definition.loop
          ? (entry.frameIndex + 1) % definition.frames
          : Math.min(definition.frames - 1, entry.frameIndex + 1)
      }
      const frames = entry.set.textures[clip]
      entry.sprite.texture = frames[Math.min(entry.frameIndex, frames.length - 1)]
    }

    if (this.debug) this.drawDebug(entry, pet)
    else entry.debug.clear()
  }

  private updateParachute(
    entry: PetEntry,
    active: boolean,
    baseScale: number,
    deltaMs: number
  ): void {
    const { view, harnessY } = entry.parachute
    view.visible = active
    if (!active) {
      entry.chuteElapsedMs = 0
      return
    }

    entry.chuteElapsedMs += deltaMs
    const phase = (entry.chuteElapsedMs / PARACHUTE_SWAY_PERIOD_MS) * Math.PI * 2
    const sway = Math.sin(phase)
    // Inflate gently on deployment, then breathe very slightly in the breeze.
    const inflation = 1 - Math.exp(-entry.chuteElapsedMs / 110)
    const billow = Math.sin(phase * 2) * 0.008 * inflation
    view.scale.set(
      baseScale * (0.82 + inflation * 0.18 + billow),
      baseScale * (0.88 + inflation * 0.12 - billow)
    )
    view.position.set(0, harnessY * baseScale)
    view.rotation = sway * 0.06
  }

  removePet(petId: string): void {
    const entry = this.entries.get(petId)
    if (!entry) return
    entry.container.destroy({ children: true })
    this.entries.delete(petId)
  }

  hitTest(petId: string, screenX: number, screenY: number): boolean {
    const entry = this.entries.get(petId)
    if (!entry) return false
    const width = entry.hitboxWidth * this.scale
    const height = entry.hitboxHeight * this.scale
    const left = entry.container.x - width / 2
    const right = entry.container.x + width / 2
    const bottom = entry.container.y
    const top = bottom - height
    return screenX >= left && screenX <= right && screenY >= top && screenY <= bottom
  }

  setScale(scale: number): void {
    this.scale = scale
  }

  setDebug(debug: boolean): void {
    this.debug = debug
    if (!debug) {
      for (const entry of this.entries.values()) entry.debug.clear()
    }
  }

  private drawDebug(entry: PetEntry, pet: Pet): void {
    const baseScale = pet.profile.baseScale * this.scale
    const width = entry.hitboxWidth * baseScale
    const height = entry.hitboxHeight * baseScale

    entry.debug.clear()
    entry.debug
      .rect(-width / 2, -height, width, height)
      .stroke({ width: 1, color: 0xffaa00, alpha: 0.75 })
    entry.debug
      .moveTo(0, 0)
      .lineTo(0, (FRAME_SIZE - entry.set.anchorY) * baseScale)
      .stroke({ width: 1, color: 0xffaa00, alpha: 0.4 })

    if (pet.targetPosition) {
      entry.debug
        .moveTo(0, 0)
        .lineTo(pet.targetPosition.x - pet.position.x, pet.targetPosition.y - pet.position.y)
        .stroke({ width: 1, color: 0x00aaff, alpha: 0.3 })
    }
  }
}
