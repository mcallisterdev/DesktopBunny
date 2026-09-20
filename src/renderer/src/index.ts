import { defaultSettings, type PetSettings } from '@config/defaults'
import { startApp } from './app'

async function main(): Promise<void> {
  const handle = await startApp(defaultSettings)
  window.desktopPet.onSettings((settings: PetSettings) => handle.applySettings(settings))
  window.desktopPet.onAddKale(() => handle.addKale())
  window.desktopPet.ready()
}

main().catch((error: unknown) => {
  console.error(error)
  window.desktopPet.log(String(error))
})
