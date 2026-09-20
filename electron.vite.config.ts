import { resolve } from 'node:path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: { index: resolve(process.cwd(), 'src/main/main.ts') }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: { index: resolve(process.cwd(), 'src/preload/index.ts') }
      }
    }
  },
  renderer: {
    root: resolve(process.cwd(), 'src/renderer'),
    resolve: {
      alias: {
        '@shared': resolve(process.cwd(), 'src/shared'),
        '@config': resolve(process.cwd(), 'src/config'),
        '@renderer': resolve(process.cwd(), 'src/renderer/src')
      }
    },
    build: {
      rollupOptions: {
        input: { index: resolve(process.cwd(), 'src/renderer/index.html') }
      }
    }
  }
})
