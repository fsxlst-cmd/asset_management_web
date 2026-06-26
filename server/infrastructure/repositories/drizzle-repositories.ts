import { and, asc, desc, eq, gte, isNull, lte } from 'drizzle-orm'
import type { Db } from '../db/client'
import { accounts, assets, categories, envelopes, holdings, ledgerEntries, snapshots } from '../db/schema'
import {
  fromLedgerEntry,
  toAccount,
  toAsset,
  toCategory,
  toEnvelope,
  toHolding,
  toLedgerEntry,
  toSnapshot,
} from '../db/mappers'
import type {
  AccountRepository,
  AssetRepository,
  CategoryListOptions,
  CategoryRepository,
  EnvelopeRepository,
  HoldingRepository,
  LedgerFilter,
  LedgerRepository,
  Repositories,
  SnapshotRepository,
} from '@core/ports/repositories'
import type { Account, AccrualRule, Category, CategoryKind, Envelope, Holding, LedgerEntry, Snapshot } from '@core/domain/entities'

/**
 * Drizzle/SQLite implementations of the repository ports. All queries are
 * parameterised by the query builder — no string-built SQL (design.md Decision 6).
 * better-sqlite3 is synchronous; methods return resolved promises to satisfy the
 * async port contract.
 */
export function createRepositories(db: Db): Repositories {
  const assetRepo: AssetRepository = {
    async getById(id) {
      const r = db.select().from(assets).where(eq(assets.id, id)).get()
      return r ? toAsset(r) : undefined
    },
    async list() {
      return db.select().from(assets).all().map(toAsset)
    },
  }

  const accountRepo: AccountRepository = {
    async create(account: Account) {
      db.insert(accounts).values({
        id: account.id,
        name: account.name,
        kind: account.kind,
        institution: account.institution ?? null,
      }).run()
    },
    async getById(id) {
      const r = db.select().from(accounts).where(eq(accounts.id, id)).get()
      return r ? toAccount(r) : undefined
    },
    async list() {
      return db.select().from(accounts).all().map(toAccount)
    },
  }

  const holdingRepo: HoldingRepository = {
    async create(holding: Holding) {
      db.insert(holdings).values({
        id: holding.id,
        accountId: holding.accountId,
        assetId: holding.assetId,
        quantity: holding.quantity.toInt(),
      }).run()
    },
    async getById(id) {
      const r = db.select().from(holdings).where(eq(holdings.id, id)).get()
      return r ? toHolding(r) : undefined
    },
    async getByAccount(accountId) {
      return db.select().from(holdings).where(eq(holdings.accountId, accountId)).all().map(toHolding)
    },
    async list() {
      return db.select().from(holdings).all().map(toHolding)
    },
    async setQuantity(holdingId, quantity) {
      db.update(holdings).set({ quantity: quantity.toInt() }).where(eq(holdings.id, holdingId)).run()
    },
  }

  const ledgerRepo: LedgerRepository = {
    async add(entry: LedgerEntry) {
      db.insert(ledgerEntries).values(fromLedgerEntry(entry)).run()
    },
    async getById(id) {
      const r = db.select().from(ledgerEntries).where(eq(ledgerEntries.id, id)).get()
      return r ? toLedgerEntry(r) : undefined
    },
    async list(filter?: LedgerFilter) {
      const conds = []
      if (filter?.envelopeId) conds.push(eq(ledgerEntries.envelopeId, filter.envelopeId))
      if (filter?.from) conds.push(gte(ledgerEntries.date, filter.from.getTime()))
      if (filter?.to) conds.push(lte(ledgerEntries.date, filter.to.getTime()))

      const rows = db
        .select()
        .from(ledgerEntries)
        .where(conds.length ? and(...conds) : undefined)
        .orderBy(desc(ledgerEntries.date))
        .all()
        .map(toLedgerEntry)

      // accountId filter spans three columns, so apply it in code (tagged-to semantics).
      if (filter?.accountId) {
        const id = filter.accountId
        return rows.filter((e) =>
          e.type === 'expense'
            ? e.sourceAccountId === id
            : e.type === 'income'
              ? e.destinationAccountId === id
              : e.sourceAccountId === id || e.destinationAccountId === id,
        )
      }
      return rows
    },
  }

  const envelopeRepo: EnvelopeRepository = {
    async create(envelope: Envelope) {
      db.insert(envelopes).values(envelopeValues(envelope)).run()
    },
    async getById(id) {
      const r = db.select().from(envelopes).where(eq(envelopes.id, id)).get()
      return r ? toEnvelope(r) : undefined
    },
    async list() {
      return db.select().from(envelopes).all().map(toEnvelope)
    },
    async setAccrual(envelopeId: string, accrual: AccrualRule) {
      db.update(envelopes)
        .set({
          accrualAmount: accrual.amount.toInt(),
          accrualPeriod: accrual.period,
          accrualAnchor: accrual.anchor.getTime(),
          accrualBaseline: accrual.baseline?.toInt() ?? null,
        })
        .where(eq(envelopes.id, envelopeId))
        .run()
    },
    async delete(id: string) {
      db.delete(envelopes).where(eq(envelopes.id, id)).run()
    },
  }

  const categoryRepo: CategoryRepository = {
    async create(category: Category) {
      db.insert(categories).values({
        id: category.id,
        name: category.name,
        kind: category.kind,
        archivedAt: category.archivedAt?.getTime() ?? null,
      }).run()
    },
    async getById(id) {
      const r = db.select().from(categories).where(eq(categories.id, id)).get()
      return r ? toCategory(r) : undefined
    },
    async list(kind: CategoryKind, options?: CategoryListOptions) {
      const conds = [eq(categories.kind, kind)]
      if (!options?.includeArchived) conds.push(isNull(categories.archivedAt))
      return db
        .select()
        .from(categories)
        .where(and(...conds))
        .orderBy(asc(categories.name))
        .all()
        .map(toCategory)
    },
    async rename(id: string, name: string) {
      db.update(categories).set({ name }).where(eq(categories.id, id)).run()
    },
    async setArchived(id: string, archivedAt: Date | undefined) {
      db.update(categories).set({ archivedAt: archivedAt?.getTime() ?? null }).where(eq(categories.id, id)).run()
    },
  }

  const snapshotRepo: SnapshotRepository = {
    async add(snapshot: Snapshot) {
      db.insert(snapshots).values({
        id: snapshot.id,
        holdingId: snapshot.holdingId,
        value: snapshot.value.toInt(),
        takenAt: snapshot.takenAt.getTime(),
      }).run()
    },
    async latestForHolding(holdingId, asOf) {
      const conds = [eq(snapshots.holdingId, holdingId)]
      if (asOf) conds.push(lte(snapshots.takenAt, asOf.getTime()))
      const r = db
        .select()
        .from(snapshots)
        .where(and(...conds))
        .orderBy(desc(snapshots.takenAt))
        .limit(1)
        .get()
      return r ? toSnapshot(r) : undefined
    },
    async list(holdingId) {
      const q = db.select().from(snapshots)
      const rows = holdingId ? q.where(eq(snapshots.holdingId, holdingId)).all() : q.all()
      return rows.map(toSnapshot)
    },
  }

  return {
    assets: assetRepo,
    accounts: accountRepo,
    holdings: holdingRepo,
    ledger: ledgerRepo,
    envelopes: envelopeRepo,
    categories: categoryRepo,
    snapshots: snapshotRepo,
  }
}

function envelopeValues(envelope: Envelope) {
  return {
    id: envelope.id,
    name: envelope.name,
    accrualAmount: envelope.accrual?.amount.toInt() ?? null,
    accrualPeriod: envelope.accrual?.period ?? null,
    accrualAnchor: envelope.accrual?.anchor.getTime() ?? null,
    accrualBaseline: envelope.accrual?.baseline?.toInt() ?? null,
  }
}
