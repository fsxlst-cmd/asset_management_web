/**
 * Data-transfer contracts shared by the API and the client. All money fields are
 * integer rupiah (minor units); the client formats them with formatRupiah().
 * These are plain serialisable shapes — no domain types (Money, Date) leak across
 * the HTTP boundary.
 */

export type AccountKind = 'bank' | 'e-wallet' | 'cash' | 'prepaid-card'
export type EntryType = 'expense' | 'income' | 'transfer'
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

export interface TransactionDto {
  id: string
  type: EntryType
  amount: number
  date: string
  note?: string
  envelopeId?: string
  envelopeName?: string
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

export interface CrossCheckDto {
  netWorthChange: number
  loggedIncome: number
  loggedExpense: number
  loggedNetFlow: number
  untracked: number
  status: 'complete' | 'untracked-spending' | 'unexplained-income'
  loggingAccuracy: number
}
