import 'pixi.js/unsafe-eval'
import { Application } from 'pixi.js'
import { defaultSettings, floorMargin, type PetSettings } from '@config/defaults'
import { tacoPersonality, tacoProfile } from '@config/taco'
import { tanyaPersonality, tanyaProfile } from '@config/tanya'
import { mathRandomSource } from '@shared/Random'
import type { DesktopBounds } from '@shared/types'
import { BehaviourController } from './behaviour/BehaviourController'
import type { WorldContext } from './behaviour/WorldContext'
import { spawnKale, type FoodItem } from './food/FoodItem'
import { PointerInteractionController } from './input/PointerInteractionController'
import { PointerTracker } from './input/pointerTracker'
import { clampX, createScreenBounds, type ScreenBounds } from './movement/screenBounds'
import { createPet, type Pet } from './pets/Pet'
import { DebugOverlay } from './rendering/DebugOverlay'
import { FoodRenderer } from './rendering/FoodRenderer'
import { SpritePetRenderer } from './rendering/SpritePetRenderer'

export interface PetAppHandle {
  applySettings(settings: PetSettings): void
  addKale(): void
}

function currentDesktop(): DesktopBounds {
  return { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight }
}

export async function startApp(initialSettings: PetSettings = defaultSettings): Promise<PetAppHandle> {
  const settings: PetSettings = { ...initialSettings }

  const app = new Application()
  await app.init({
    backgroundAlpha: 0,
    resizeTo: window,
    antialias: true,
    autoDensity: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2)
  })
  document.body.appendChild(app.canvas)

  let bounds: ScreenBounds = createScreenBounds(currentDesktop(), floorMargin)

  const pets: Pet[] = [
    createPet('taco', tacoProfile, tacoPersonality, {
      x: bounds.width * 0.32,
      y: bounds.floorY
    }),
    createPet('tanya', tanyaProfile, tanyaPersonality, {
      x: bounds.width * 0.68,
      y: bounds.floorY
    })
  ]
  pets[0].facing = 'right'
  pets[1].facing = 'left'

  const food: FoodItem[] = []
  const foodRenderer = new FoodRenderer(app)

  const renderer = new SpritePetRenderer(app)
  renderer.setScale(settings.scale)
  renderer.setDebug(settings.debug)
  for (const pet of pets) renderer.createPet(pet)

  const overlay = new DebugOverlay(app)
  overlay.setEnabled(settings.debug)

  const pointer = new PointerTracker()
  pointer.attach()

  // OS cursor polling supplies hover while the native window is click-through.
  window.desktopPet.onPointerPoll(({ x, y }) => pointer.setPosition(x, y))

  const interaction = new PointerInteractionController((petId, x, y) =>
    renderer.hitTest(petId, x, y)
  )
  let capturing = false

  // Reset both sides of capture after wake, including any interrupted drag.
  window.desktopPet.onResume(() => {
    pointer.reset()
    interaction.reset(pets)
    capturing = false
  })

  const controller = new BehaviourController()
  const world = (): WorldContext => ({
    pets,
    food,
    bounds,
    random: mathRandomSource,
    pointer: pointer.position,
    timeMs: performance.now()
  })

  for (const pet of pets) controller.enter(pet, 'idle', world())

  app.ticker.add((ticker) => {
    const deltaMs = Math.min(ticker.deltaMS, 100)
    const capture = interaction.update(
      pets,
      { x: pointer.position.x, y: pointer.position.y, down: pointer.down },
      bounds,
      deltaMs
    )
    if (capture.capturing !== capturing) {
      capturing = capture.capturing
      window.desktopPet.setPointerCapturing(capturing)
    }

    for (const pet of pets) {
      controller.update(pet, world(), deltaMs)
      renderer.updatePet(pet, deltaMs)
    }
    foodRenderer.update(food)
    overlay.update(pets, bounds, settings.scale, food)
  })

  window.addEventListener('resize', () => {
    bounds = createScreenBounds(currentDesktop(), floorMargin)
    for (const pet of pets) {
      const parachuting = pet.state === 'parachute'
      if (!parachuting) {
        pet.position.y = bounds.floorY
        pet.stateStartPosition.y = bounds.floorY
      }
      pet.position.x = clampX(pet.position.x, pet.profile.hitboxWidth / 2, bounds)
      if (pet.targetPosition) {
        pet.targetPosition.y = bounds.floorY
        pet.targetPosition.x = clampX(pet.targetPosition.x, pet.profile.hitboxWidth / 2, bounds)
      }
    }
  })

  return {
    applySettings(next: PetSettings): void {
      settings.scale = next.scale
      settings.debug = next.debug
      renderer.setScale(next.scale)
      renderer.setDebug(next.debug)
      overlay.setEnabled(next.debug)
    },
    addKale(): void {
      spawnKale(food, bounds, mathRandomSource)
    }
  }
}
