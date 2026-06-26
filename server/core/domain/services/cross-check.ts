import { Money } from '../money'
import type { LedgerEntry } from '../entities'
import { liveBalance, type SnapshotPoint } from './live-balance'

/**
 * Cross-check (reconciliation spec): compare the change in net worth between two
 * snapshots against the net of logged cashflow. A difference is spending (or income)
 * that was never logged.
 *
 *   loggedNetFlow = Σ income − Σ expenses            (transfers excluded; they net to zero)
 *   netWorthChange = netWorthEnd − netWorthStart      (from real snapshots)
 *   untracked      = loggedNetFlow − netWorthChange
 *
 * Worked example from the spec/mockup: net worth dropped 1.200.000, logged 980.000 of
 * spending → untracked = (−980.000) − (−1.200.000) = +220.000 of untracked spending.
 */
export type CrossCheckStatus = 'complete' | 'untracked-spending' | 'unexplained-income'

export interface CrossCheckResult {
  readonly netWorthChange: Money
  readonly loggedIncome: Money
  readonly loggedExpense: Money
  readonly loggedNetFlow: Money
  /** Positive → untracked spending; negative → unexplained income; zero → complete. */
  readonly untracked: Money
  readonly status: CrossCheckStatus
  /** 0–100: share of the period's movement that logging explains. */
  readonly loggingAccuracy: number
}

export interface CrossCheckInput {
  readonly netWorthStart: Money
  readonly netWorthEnd: Money
  readonly entriesInPeriod: readonly LedgerEntry[]
}

export function crossCheck(input: CrossCheckInput): CrossCheckResult {
  const { netWorthStart, netWorthEnd, entriesInPeriod } = input

  const loggedIncome = Money.sum(
    entriesInPeriod.filter((e) => e.type === 'income').map((e) => e.amount),
  )
  const loggedExpense = Money.sum(
    entriesInPeriod.filter((e) => e.type === 'expense').map((e) => e.amount),
  )

  const loggedNetFlow = loggedIncome.minus(loggedExpense)
  const netWorthChange = netWorthEnd.minus(netWorthStart)
  const untracked = loggedNetFlow.minus(netWorthChange)

  const status: CrossCheckStatus = untracked.isZero()
    ? 'complete'
    : untracked.isPositive()
      ? 'untracked-spending'
      : 'unexplained-income'

  // Accuracy: how much of the larger of (movement, logged flow) is explained.
  const denominator = Math.max(netWorthChange.abs().toInt(), loggedNetFlow.abs().toInt(), 1)
  const explained = 1 - untracked.abs().toInt() / denominator
  const loggingAccuracy = Math.round(Math.min(1, Math.max(0, explained)) * 100)

  return {
    netWorthChange,
    loggedIncome,
    loggedExpense,
    loggedNetFlow,
    untracked,
    status,
    loggingAccuracy,
  }
}

/**
 * Per-account drift (reconciliation spec, requirement 3): the difference between the
 * real balance the user enters and what the app expected from the last snapshot plus
 * tagged movements. The more an account's activity is tagged, the closer the expected
 * balance tracks reality, so this drift shrinks — "tagging narrows the gap".
 */
export function accountDrift(
  accountId: string,
  lastSnapshot: SnapshotPoint | undefined,
  entries: readonly LedgerEntry[],
  realBalanceNow: Money,
): Money {
  const expected = liveBalance(accountId, lastSnapshot, entries)
  return realBalanceNow.minus(expected)
}
