import { fileURLToPath } from 'node:url'

const aliases = {
  '@core': fileURLToPath(new URL('./server/core', import.meta.url)),
  '@infra': fileURLToPath(new URL('./server/infrastructure', import.meta.url)),
  '@shared': fileURLToPath(new URL('./shared', import.meta.url)),
}

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: true },

  srcDir: 'app/',
  // server/ lives at the repo root (the layered backend), not under app/.
  serverDir: fileURLToPath(new URL('./server', import.meta.url)),

  alias: aliases,
  nitro: { alias: aliases },

  modules: ['@nuxtjs/tailwindcss', '@pinia/nuxt'],

  app: {
    head: {
      title: 'Finance Hub',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1.0' },
      ],
      link: [
        // Inter + Material Symbols, matching the design mockups.
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap',
        },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap',
        },
      ],
    },
  },

  tailwindcss: {
    cssPath: '~/assets/css/main.css',
    configPath: '~~/tailwind.config.ts',
  },
})
