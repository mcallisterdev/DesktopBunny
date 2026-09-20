import { app, Menu, nativeImage, Tray, type MenuItemConstructorOptions } from 'electron'
import { join } from 'node:path'
import { scalePresets } from '../config/defaults'
import type { SettingsStore } from './settingsStore'
import { applyLoginItem } from './startup'
import type { WindowManager } from './windowManager'

export function createTray(settings: SettingsStore, windows: WindowManager): Tray {
  const icon = nativeImage.createFromPath(trayIconPath())
  const tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon.resize({ width: 16, height: 16 }))
  tray.setToolTip('Taco & Tanya')

  const refresh = (): void => {
    const current = settings.get()

    const template: MenuItemConstructorOptions[] = [
      {
        label: current.enabled ? 'Hide rabbits' : 'Show rabbits',
        click: () => {
          void settings.update({ enabled: !settings.get().enabled }).then(() => {
            windows.applySettings()
            refresh()
          })
        }
      },
      { type: 'separator' },
      {
        label: 'Size',
        submenu: [
          {
            label: 'Small',
            type: 'radio',
            checked: Math.abs(current.scale - scalePresets.small) < 0.01,
            click: () => void setScale(scalePresets.small)
          },
          {
            label: 'Medium',
            type: 'radio',
            checked: Math.abs(current.scale - scalePresets.medium) < 0.01,
            click: () => void setScale(scalePresets.medium)
          },
          {
            label: 'Large',
            type: 'radio',
            checked: Math.abs(current.scale - scalePresets.large) < 0.01,
            click: () => void setScale(scalePresets.large)
          }
        ]
      },
      {
        label: 'Launch at login',
        type: 'checkbox',
        checked: current.launchAtLogin,
        click: (item) => {
          void settings.update({ launchAtLogin: item.checked }).then((next) => {
            applyLoginItem(next.launchAtLogin)
            refresh()
          })
        }
      },
      {
        label: 'Debug overlay',
        type: 'checkbox',
        checked: current.debug,
        click: (item) => {
          void settings.update({ debug: item.checked }).then(() => {
            windows.applySettings()
            refresh()
          })
        }
      },
      { type: 'separator' },
      { label: 'Add kale', click: () => windows.addKale() },
      { type: 'separator' },
      { label: 'Quit', click: () => app.quit() }
    ]

    tray.setContextMenu(Menu.buildFromTemplate(template))
  }

  const setScale = async (scale: number): Promise<void> => {
    await settings.update({ scale })
    windows.applySettings()
    refresh()
  }

  refresh()
  tray.on('click', () => windows.applySettings())

  return tray
}

function trayIconPath(): string {
  if (app.isPackaged) return join(process.resourcesPath, 'tray.png')
  return join(app.getAppPath(), 'resources', 'tray.png')
}
