import { app } from 'electron'
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { defaultSettings, type PetSettings } from '../config/defaults'

export class SettingsStore {
  private settings: PetSettings = { ...defaultSettings }

  private filePath(): string {
    return join(app.getPath('userData'), 'settings.json')
  }

  async load(): Promise<PetSettings> {
    try {
      const raw = await fs.readFile(this.filePath(), 'utf-8')
      const parsed = JSON.parse(raw) as Partial<PetSettings>
      this.settings = { ...defaultSettings, ...parsed }
    } catch {
      this.settings = { ...defaultSettings }
    }
    return this.settings
  }

  get(): PetSettings {
    return this.settings
  }

  async update(patch: Partial<PetSettings>): Promise<PetSettings> {
    this.settings = { ...this.settings, ...patch }
    try {
      await fs.writeFile(this.filePath(), JSON.stringify(this.settings, null, 2), 'utf-8')
    } catch {
      return this.settings
    }
    return this.settings
  }
}
