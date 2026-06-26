import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import Database from 'better-sqlite3'
import { describe, it, expect } from 'vitest'

/**
 * Verifies the 0002 data migration: existing income/expense rows (created before
 * categories existed) must be backfilled to the system "Other" category of the
 * matching kind, while transfers stay untagged. Runs the real migration SQL file.
 */
const here = dirname(fileURLToPath(import.meta.url))
const migration0002 = readFileSync(join(here, 'migrations', '0002_add_categories.sql'), 'utf8')

function legacyLedgerSchema(db: Database.Database) {
  // The ledger_entries shape as it existed just before migration 0002 (no category_id).
  db.exec(`
    CREATE TABLE ledger_entries (
      id text PRIMARY KEY NOT NULL,
      type text NOT NULL,
      amount integer NOT NULL,
      date integer NOT NULL,
      note text,
      envelope_id text,
      source_account_id text,
      destination_account_id text
    );
  `)
}

describe('0002 add_categories migration', () => {
  it('backfills existing income/expense to "Other" and leaves transfers untagged', () => {
    const db = new Database(':memory:')
    legacyLedgerSchema(db)

    // Pre-existing rows from before categories existed.
    db.exec(`
      INSERT INTO ledger_entries (id, type, amount, date) VALUES
        ('i1', 'income', 1000, 1),
        ('e1', 'expense', 500, 2),
        ('t1', 'transfer', 200, 3);
    `)

    // Apply the real migration (DDL + data backfill), statement by statement.
    for (const stmt of migration0002.split('--> statement-breakpoint')) {
      const sql = stmt.trim()
      if (sql) db.exec(sql)
    }

    const cats = db.prepare(`SELECT id, name, kind FROM categories ORDER BY kind`).all() as {
      id: string
      name: string
      kind: string
    }[]
    expect(cats).toEqual([
      { id: 'cat_other_expense', name: 'Other', kind: 'expense' },
      { id: 'cat_other_income', name: 'Other', kind: 'income' },
    ])

    const rows = db.prepare(`SELECT id, category_id FROM ledger_entries ORDER BY id`).all() as {
      id: string
      category_id: string | null
    }[]
    expect(rows).toEqual([
      { id: 'e1', category_id: 'cat_other_expense' },
      { id: 'i1', category_id: 'cat_other_income' },
      { id: 't1', category_id: null },
    ])

    db.close()
  })
})
