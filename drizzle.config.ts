import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'sqlite',
  schema: './server/infrastructure/db/schema.ts',
  out: './server/infrastructure/db/migrations',
  dbCredentials: {
    url: process.env.DATABASE_PATH ?? './data/assetmanagement.db',
  },
})
