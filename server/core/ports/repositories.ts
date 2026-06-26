import type {
  Account,
  Asset,
  Category,
  CategoryKind,
  Envelope,
  Holding,
  LedgerEntry,
  Snapshot,
  AccrualRule,
} from '../domain/entities'

/**
 * Repository interfaces (ports). The domain/application layers depend only on these;
 * concrete SQLite/Drizzle adapters live in server/infrastructure and implement them
 * (Dependency Inversion — design.md Decision 2 & 4).
 */

export interface AssetRepository {
  getById(id: string): Promise<Asset | undefined>
  list(): Promise<Asset[]>
}

export interface AccountRepository {
  create(account: Account): Promise<void>
  getById(id: string): Promise<Account | undefined>
  list(): Promise<Account[]>
}

export interface HoldingRepository {
  create(holding: Holding): Promise<void>
  getById(id: string): Promise<Holding | undefined>
  getByAccount(accountId: string): Promise<Holding[]>
  list(): Promise<Holding[]>
  /** Replace a holding's quantity (used by snapshot). */
  setQuantity(holdingId: string, quantity: Holding['quantity']): Promise<void>
}

export interface LedgerFilter {
  readonly accountId?: string
  readonly envelopeId?: string
  /** Inclusive lower bound. */
  readonly from?: Date
  /** Inclusive upper bound. */
  readonly to?: Date
}

export interface LedgerRepository {
  add(entry: LedgerEntry): Promise<void>
  getById(id: string): Promise<LedgerEntry | undefined>
  /** All entries matching the filter, newest first. */
  list(filter?: LedgerFilter): Promise<LedgerEntry[]>
}

export interface EnvelopeRepository {
  create(envelope: Envelope): Promise<void>
  getById(id: string): Promise<Envelope | undefined>
  list(): Promise<Envelope[]>
  /** Update only the accrual rule, leaving past (recomputed) accruals untouched. */
  setAccrual(envelopeId: string, accrual: AccrualRule): Promise<void>
  delete(id: string): Promise<void>
}

export interface CategoryListOptions {
  /** Include archived (soft-deleted) categories. Default false — pickers want only active. */
  readonly includeArchived?: boolean
}

export interface CategoryRepository {
  create(category: Category): Promise<void>
  getById(id: string): Promise<Category | undefined>
  /** Categories of one kind, optionally including archived ones. */
  list(kind: CategoryKind, options?: CategoryListOptions): Promise<Category[]>
  /** Rename a category, leaving kind and archived state untouched. */
  rename(id: string, name: string): Promise<void>
  /** Set or clear the archived timestamp (archive / restore). */
  setArchived(id: string, archivedAt: Date | undefined): Promise<void>
}

export interface SnapshotRepository {
  add(snapshot: Snapshot): Promise<void>
  /** Most recent snapshot for a holding, optionally as-of a point in time. */
  latestForHolding(holdingId: string, asOf?: Date): Promise<Snapshot | undefined>
  list(holdingId?: string): Promise<Snapshot[]>
}

/** The full set of repositories, handed to use-cases (often inside a UnitOfWork). */
export interface Repositories {
  readonly assets: AssetRepository
  readonly accounts: AccountRepository
  readonly holdings: HoldingRepository
  readonly ledger: LedgerRepository
  readonly envelopes: EnvelopeRepository
  readonly categories: CategoryRepository
  readonly snapshots: SnapshotRepository
}
