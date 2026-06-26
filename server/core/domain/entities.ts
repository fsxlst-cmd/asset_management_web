import { Money } from './money'

/**
 * Domain entities for phase 1 (cash). Modelled as plain immutable data shapes;
 * behaviour lives in the value object (Money) and the pure services under ./services.
 *
 * The spine is asset-type-agnostic (accounts-holdings spec) so future assets
 * (gold, bonds, stock) plug in without changing Account/Holding.
 */

// ── Asset catalog ────────────────────────────────────────────────────────────

export type AssetKind = 'cash' // phase 1; extensible later

export interface Asset {
  readonly id: string
  readonly kind: AssetKind
  readonly name: string
  /** Unit of measure, e.g. 'IDR' for cash, 'gram' for gold. */
  readonly unit: string
  /**
   * Value of one unit in base-currency minor units. For cash this is 1
   * (one rupiah of cash is worth one rupiah), so a holding's value equals its quantity.
   */
  readonly unitValue: Money
}

// ── Accounts & holdings ──────────────────────────────────────────────────────

export type AccountKind = 'bank' | 'e-wallet' | 'cash' | 'prepaid-card'

export interface Account {
  readonly id: string
  readonly name: string
  readonly kind: AccountKind
  /** Optional — physical-cash accounts have none. */
  readonly institution?: string
}

/** How much of one asset sits in one account. No balance is stored on the Account. */
export interface Holding {
  readonly id: string
  readonly accountId: string
  readonly assetId: string
  /** For cash, quantity is rupiah and value === quantity. */
  readonly quantity: Money
}

// ── Cashflow ledger ──────────────────────────────────────────────────────────

export type EntryType = 'expense' | 'income' | 'transfer'

interface LedgerEntryBase {
  readonly id: string
  readonly type: EntryType
  readonly amount: Money
  /** Calendar date of the entry (no time-of-day semantics in the domain). */
  readonly date: Date
  readonly note?: string
}

/**
 * Money out. Always assigned to exactly one budget AND exactly one expense-kind
 * category (two independent dimensions); optionally tagged to a source account.
 */
export interface ExpenseEntry extends LedgerEntryBase {
  readonly type: 'expense'
  readonly envelopeId: string
  readonly categoryId: string
  readonly sourceAccountId?: string
}

/** Money in. Always assigned an income-kind category; optionally tagged to a destination account. */
export interface IncomeEntry extends LedgerEntryBase {
  readonly type: 'income'
  readonly categoryId: string
  readonly destinationAccountId?: string
}

/** Value moved between two accounts. No budget, no net-worth change. */
export interface TransferEntry extends LedgerEntryBase {
  readonly type: 'transfer'
  readonly sourceAccountId: string
  readonly destinationAccountId: string
}

export type LedgerEntry = ExpenseEntry | IncomeEntry | TransferEntry

// ── Budget envelopes ─────────────────────────────────────────────────────────

export type AccrualPeriod = 'day' | 'week' | 'month'

/**
 * Defined separately from the entries it generates, so changing the rate never
 * rewrites the past. When the rate changes, the envelope re-anchors: `anchor` moves
 * to the change time and `baseline` freezes everything accrued at the old rate, so
 * only future accruals use the new rate (budget-envelopes spec).
 */
export interface AccrualRule {
  readonly amount: Money
  readonly period: AccrualPeriod
  /** Accruals at the current rate are counted from this instant forward. */
  readonly anchor: Date
  /** Total accrued before `anchor`, frozen at prior rates. Absent ⇒ zero. */
  readonly baseline?: Money
}

export interface Envelope {
  readonly id: string
  readonly name: string
  /** Optional — an envelope may exist without a recurring accrual. */
  readonly accrual?: AccrualRule
}

// ── Transaction categories ───────────────────────────────────────────────────

export type CategoryKind = 'income' | 'expense'

/**
 * A user-managed classification label for income or expense entries. A second,
 * independent dimension from the budget envelope. Plain label — no budget/target.
 * Income and expense categories form two separate lists (never mixed) keyed by `kind`.
 * Soft-deleted via `archivedAt`: an archived category is hidden from pickers but
 * stays readable on records already tagged with it, and can be restored.
 */
export interface Category {
  readonly id: string
  readonly name: string
  readonly kind: CategoryKind
  /** When archived (soft-deleted); absent ⇒ active. */
  readonly archivedAt?: Date
}

// ── Snapshots (reconciliation) ───────────────────────────────────────────────

/** A point-in-time, user-entered real balance for one holding. Source of truth for net worth. */
export interface Snapshot {
  readonly id: string
  readonly holdingId: string
  readonly value: Money
  readonly takenAt: Date
}
