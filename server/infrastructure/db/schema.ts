import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

/**
 * SQLite schema (Drizzle). design.md Decision 3: every money column is INTEGER
 * (rupiah, minor units) — never a float. Dates are stored as epoch milliseconds
 * (integer) for exact, timezone-free ordering.
 */

export const assets = sqliteTable('assets', {
  id: text('id').primaryKey(),
  kind: text('kind').notNull(), // 'cash'
  name: text('name').notNull(),
  unit: text('unit').notNull(), // 'IDR', 'gram', ...
  unitValue: integer('unit_value').notNull(), // minor units per one unit; cash = 1
})

export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  kind: text('kind').notNull(), // 'bank' | 'e-wallet' | 'cash' | 'prepaid-card'
  institution: text('institution'),
})

export const holdings = sqliteTable('holdings', {
  id: text('id').primaryKey(),
  accountId: text('account_id')
    .notNull()
    .references(() => accounts.id),
  assetId: text('asset_id')
    .notNull()
    .references(() => assets.id),
  quantity: integer('quantity').notNull(), // for cash, rupiah
})

export const envelopes = sqliteTable('envelopes', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  // Accrual rule is inlined (nullable) — an envelope may have no recurring accrual.
  accrualAmount: integer('accrual_amount'),
  accrualPeriod: text('accrual_period'), // 'day' | 'week' | 'month'
  accrualAnchor: integer('accrual_anchor'), // epoch ms
  accrualBaseline: integer('accrual_baseline'), // frozen accruals before anchor (rate changes)
})

/**
 * User-managed income/expense classification labels. Two separate lists keyed by
 * `kind`. Nullable `archived_at` (epoch ms) implements soft-delete: set ⇒ archived.
 */
export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  kind: text('kind').notNull(), // 'income' | 'expense'
  archivedAt: integer('archived_at'), // epoch ms; null ⇒ active
})

export const ledgerEntries = sqliteTable('ledger_entries', {
  id: text('id').primaryKey(),
  type: text('type').notNull(), // 'expense' | 'income' | 'transfer'
  amount: integer('amount').notNull(),
  date: integer('date').notNull(), // epoch ms
  note: text('note'),
  // expense
  envelopeId: text('envelope_id').references(() => envelopes.id),
  sourceAccountId: text('source_account_id').references(() => accounts.id),
  // income / transfer
  destinationAccountId: text('destination_account_id').references(() => accounts.id),
  // income / expense classification (required for those types, enforced in the use-case;
  // nullable column mirrors how envelope_id is modelled, and transfers leave it null)
  categoryId: text('category_id').references(() => categories.id),
})

export const snapshots = sqliteTable('snapshots', {
  id: text('id').primaryKey(),
  holdingId: text('holding_id')
    .notNull()
    .references(() => holdings.id),
  value: integer('value').notNull(),
  takenAt: integer('taken_at').notNull(), // epoch ms
})
