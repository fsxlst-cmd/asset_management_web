/**
 * Data-transfer contracts shared by the API and the client. All money fields are
 * integer rupiah (minor units); the client formats them with formatRupiah().
 * These are plain serialisable shapes — no domain types (Money, Date) leak across
 * the HTTP boundary.
 */

export type AccountKind = 'bank' | 'e-wallet' | 'cash' | 'prepaid-card'
export type EntryType = 'expense' | 'income' | 'transfer'
export type CategoryKind = 'income' | 'expense'
export type AccrualPeriod = 'day' | 'week' | 'month'
export type AccuracyBadge = 'live-tracked' | 'updated-weekly'

export interface AccountDto {
  id: string
  name: string
  kind: AccountKind
  institution?: string
  /** The account's cash holding id (phase 1: one per account) — used by reconciliation. */
  holdingId: string | null
  /** Derived live balance (last snapshot + tagged movements since), in rupiah. */
  balance: number
  /** Whether this account is mostly kept live by tagging, or only via snapshots. */
  accuracy: AccuracyBadge
  /** ISO timestamp of the last snapshot, or null if never reconciled. */
  lastSnapshotAt: string | null
}

export interface CategoryDto {
  id: string
  name: string
  kind: CategoryKind
  /** True when soft-deleted (archived) — hidden from pickers, kept on old records. */
  archived: boolean
}

export interface TransactionDto {
  id: string
  type: EntryType
  amount: number
  date: string
  note?: string
  envelopeId?: string
  envelopeName?: string
  /** Income/expense classification (transfers have none). */
  categoryId?: string
  categoryName?: string
  sourceAccountId?: string
  destinationAccountId?: string
}

export interface EnvelopeDto {
  id: string
  name: string
  /** Running balance = accrued − assigned expenses, in rupiah (may be negative). */
  balance: number
  accrual?: { amount: number; period: AccrualPeriod }
}

export interface DashboardDto {
  netWorth: number
  lastSnapshotAt: string | null
  accounts: AccountDto[]
  primaryEnvelope: EnvelopeDto | null
  recentTransactions: TransactionDto[]
}

export interface AccountGroupDto {
  kind: AccountKind
  label: string
  subtotal: number
  accounts: AccountDto[]
}

export interface AccountsViewDto {
  groups: AccountGroupDto[]
  netWorth: number
}

export interface AccountDetailDto {
  account: AccountDto
  income: number
  expense: number
  transactions: TransactionDto[]
}

export interface EnvelopeDetailDto {
  envelope: EnvelopeDto
  transactions: TransactionDto[]
}

/** How a category's spend moved vs last month — drives which delta field the UI shows. */
export type SpendingDeltaKind = 'percent' | 'absolute' | 'new'

export interface SpendingCategoryRowDto {
  categoryId: string
  categoryName: string
  /** This month's total for the category, in rupiah. */
  amount: number
  /** Share of the month's total expense, 0–1. */
  share: number
  /** Same as `amount`; named for symmetry with `lastMonth` in delta logic. */
  thisMonth: number
  /** The category's total in the previous WIB month, in rupiah (0 if it had none). */
  lastMonth: number
  deltaKind: SpendingDeltaKind
  /** Set when deltaKind === 'percent': fractional change vs last month (0.45 = +45%). */
  deltaPercent?: number
  /** Set when deltaKind === 'absolute': signed rupiah change vs a tiny last-month base. */
  deltaAbsolute?: number
}

/** A category that had spend last month but none this month. */
export interface SpendingQuietRowDto {
  categoryId: string
  categoryName: string
  lastMonth: number
}

export interface SpendingReportDto {
  /** The reported month as `YYYY-MM` (WIB). */
  month: string
  /** Total expense this month, in rupiah. */
  total: number
  /** Total expense in the previous WIB month, in rupiah. */
  totalLastMonth: number
  /** Fractional change of the month total vs last month; omitted when last month was zero. */
  totalDeltaPercent?: number
  /** Categories with spend this month, largest first. */
  rows: SpendingCategoryRowDto[]
  /** Categories that went quiet (spent last month, nothing this month). */
  quiet: SpendingQuietRowDto[]
}

export interface CrossCheckDto {
  netWorthChange: number
  loggedIncome: number
  loggedExpense: number
  loggedNetFlow: number
  untracked: number
  status: 'complete' | 'untracked-spending' | 'unexplained-income'
  loggingAccuracy: number
}
