import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { getDb } from './client'

/** Apply all pending migrations. Run via `npm run db:migrate`. */
const migrationsFolder = join(dirname(fileURLToPath(import.meta.url)), 'migrations')

getDb()
migrate(getDb(), { migrationsFolder })
console.log('[db] migrations applied from', migrationsFolder)
