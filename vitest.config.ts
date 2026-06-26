import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  test: {
    // The domain is framework-agnostic, so tests need no Nuxt/DOM environment.
    environment: 'node',
    include: ['server/**/*.test.ts', 'shared/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@core': fileURLToPath(new URL('./server/core', import.meta.url)),
      '@infra': fileURLToPath(new URL('./server/infrastructure', import.meta.url)),
      '@shared': fileURLToPath(new URL('./shared', import.meta.url)),
    },
  },
})
