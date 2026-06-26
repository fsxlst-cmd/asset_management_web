import type {
  Account,
  Asset,
  Envelope,
  Holding,
  LedgerEntry,
  Snapshot,
  AccrualRule,
} from '../domain/entities'
import type {
  AccountRepository,
  AssetRepository,
  EnvelopeRepository,
  HoldingRepository,
  LedgerFilter,
  LedgerRepository,
  Repositories,
  SnapshotRepository,
} from '../ports/repositories'
import type { UnitOfWork } from '../ports/unit-of-work'
import type { Clock } from '../ports/clock'
import type { IdGenerator } from '../ports/id-generator'

/**
 * In-memory implementations of the ports, for unit-testing use-cases with zero
 * infrastructure. Also a reference implementation of the repository contracts.
 */
interface Store {
  assets: Asset[]
  accounts: Account[]
  holdings: Holding[]
  ledger: LedgerEntry[]
  envelopes: Envelope[]
  snapshots: Snapshot[]
}

function emptyStore(): Store {
  return { assets: [], accounts: [], holdings: [], ledger: [], envelopes: [], snapshots: [] }
}

function cloneStore(s: Store): Store {
  // Entities are immutable, so a shallow array copy is enough to isolate a transaction.
  return {
    assets: [...s.assets],
    accounts: [...s.accounts],
    holdings: [...s.holdings],
    ledger: [...s.ledger],
    envelopes: [...s.envelopes],
    snapshots: [...s.snapshots],
  }
}

function makeRepositories(store: Store): Repositories {
  const assets: AssetRepository = {
    async getById(id) {
      return store.assets.find((a) => a.id === id)
    },
    async list() {
      return [...store.assets]
    },
  }

  const accounts: AccountRepository = {
    async create(account) {
      store.accounts.push(account)
    },
    async getById(id) {
      return store.accounts.find((a) => a.id === id)
    },
    async list() {
      return [...store.accounts]
    },
  }

  const holdings: HoldingRepository = {
    async create(holding) {
      store.holdings.push(holding)
    },
    async getById(id) {
      return store.holdings.find((h) => h.id === id)
    },
    async getByAccount(accountId) {
      return store.holdings.filter((h) => h.accountId === accountId)
    },
    async list() {
      return [...store.holdings]
    },
    async setQuantity(holdingId, quantity) {
      const idx = store.holdings.findIndex((h) => h.id === holdingId)
      if (idx >= 0) store.holdings[idx] = { ...store.holdings[idx]!, quantity }
    },
  }

  const ledger: LedgerRepository = {
    async add(entry) {
      store.ledger.push(entry)
    },
    async getById(id) {
      return store.ledger.find((e) => e.id === id)
    },
    async list(filter?: LedgerFilter) {
      let rows = [...store.ledger]
      if (filter?.envelopeId) {
        rows = rows.filter((e) => e.type === 'expense' && e.envelopeId === filter.envelopeId)
      }
      if (filter?.accountId) {
        rows = rows.filter((e) => taggedTo(e, filter.accountId!))
      }
      if (filter?.from) rows = rows.filter((e) => e.date >= filter.from!)
      if (filter?.to) rows = rows.filter((e) => e.date <= filter.to!)
      return rows.sort((a, b) => b.date.getTime() - a.date.getTime())
    },
  }

  const envelopes: EnvelopeRepository = {
    async create(envelope) {
      store.envelopes.push(envelope)
    },
    async getById(id) {
      return store.envelopes.find((e) => e.id === id)
    },
    async list() {
      return [...store.envelopes]
    },
    async setAccrual(envelopeId: string, accrual: AccrualRule) {
      const idx = store.envelopes.findIndex((e) => e.id === envelopeId)
      if (idx >= 0) store.envelopes[idx] = { ...store.envelopes[idx]!, accrual }
    },
    async delete(id: string) {
      const idx = store.envelopes.findIndex((e) => e.id === id)
      if (idx >= 0) store.envelopes.splice(idx, 1)
    },
  }

  const snapshots: SnapshotRepository = {
    async add(snapshot) {
      store.snapshots.push(snapshot)
    },
    async latestForHolding(holdingId, asOf) {
      return store.snapshots
        .filter((s) => s.holdingId === holdingId && (!asOf || s.takenAt <= asOf))
        .sort((a, b) => b.takenAt.getTime() - a.takenAt.getTime())[0]
    },
    async list(holdingId) {
      return store.snapshots.filter((s) => !holdingId || s.holdingId === holdingId)
    },
  }

  return { assets, accounts, holdings, ledger, envelopes, snapshots }
}

function taggedTo(entry: LedgerEntry, accountId: string): boolean {
  switch (entry.type) {
    case 'expense':
      return entry.sourceAccountId === accountId
    case 'income':
      return entry.destinationAccountId === accountId
    case 'transfer':
      return entry.sourceAccountId === accountId || entry.destinationAccountId === accountId
  }
}

export class InMemoryDatabase {
  readonly store: Store = emptyStore()
  readonly repos: Repositories = makeRepositories(this.store)

  /** A UnitOfWork that rolls back the store if the work throws. */
  readonly uow: UnitOfWork = {
    transaction: async <T>(work: (repos: Repositories) => Promise<T>): Promise<T> => {
      const backup = cloneStore(this.store)
      try {
        return await work(this.repos)
      } catch (err) {
        // Restore every array to its pre-transaction contents.
        Object.assign(this.store, backup)
        throw err
      }
    },
  }
}

export class FakeClock implements Clock {
  constructor(private current: Date) {}
  now(): Date {
    return this.current
  }
  set(d: Date): void {
    this.current = d
  }
}

export class SequentialIds implements IdGenerator {
  private n = 0
  constructor(private readonly prefix = 'id') {}
  next(): string {
    this.n += 1
    return `${this.prefix}-${this.n}`
  }
}
