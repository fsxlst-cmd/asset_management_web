import { eq } from 'drizzle-orm'
import { getDb } from './client'
import { assets } from './schema'

/**
 * Seed the catalog: only the cash asset (accounts-holdings spec — cash is the seeded
 * asset). Budget envelopes are NOT seeded — the user creates, edits, and deletes their
 * own recurring budgets (budget-envelopes spec). Idempotent: safe to run repeatedly.
 * Run via `npm run db:seed`.
 */
const db = getDb()

const existingCash = db.select().from(assets).where(eq(assets.id, 'cash')).get()
if (!existingCash) {
  db.insert(assets).values({ id: 'cash', kind: 'cash', name: 'Cash', unit: 'IDR', unitValue: 1 }).run()
  console.log('[seed] inserted cash asset')
}

console.log('[seed] done')
