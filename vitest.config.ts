import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@shared': resolve(process.cwd(), 'src/shared'),
      '@config': resolve(process.cwd(), 'src/config'),
      '@renderer': resolve(process.cwd(), 'src/renderer/src')
    }
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts']
  }
})
