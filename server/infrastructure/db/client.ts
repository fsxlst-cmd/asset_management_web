import { existsSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import Database from 'better-sqlite3'
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'

export type DbSchema = typeof schema
export type Db = BetterSQLite3Database<DbSchema>

let singleton: { db: Db; sqlite: Database.Database } | undefined

function resolveDbPath(): string {
  return process.env.DATABASE_PATH ?? './data/assetmanagement.db'
}

/**
 * Opens the SQLite database. design.md Decision 6 (at-rest safety): if DATABASE_KEY
 * is set AND a SQLCipher-compatible driver is installed (better-sqlite3-multiple-ciphers),
 * the file is encrypted via `PRAGMA key`. With the stock better-sqlite3 driver the
 * pragma is a no-op/ignored, so the swap is the only change needed to enable encryption.
 */
export function getDb(): Db {
  if (singleton) return singleton.db

  const path = resolveDbPath()
  if (path !== ':memory:') {
    const dir = dirname(path)
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  }

  const sqlite = new Database(path)
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')

  const key = process.env.DATABASE_KEY
  if (key) {
    try {
      sqlite.pragma(`key = '${key.replace(/'/g, "''")}'`)
    } catch {
      console.warn('[db] DATABASE_KEY set but the driver does not support encryption; install better-sqlite3-multiple-ciphers.')
    }
  }

  const db = drizzle(sqlite, { schema })
  singleton = { db, sqlite }
  return db
}

/** Raw handle, for migrations and the UnitOfWork transaction control. */
export function getSqlite(): Database.Database {
  getDb()
  return singleton!.sqlite
}
