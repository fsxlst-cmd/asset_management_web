import { Money } from '../money'
import type { LedgerEntry } from '../entities'

/**
 * Live account balance — derived on read (design.md Decision 5), never stored as a
 * mutable running total:
 *
 *   liveBalance(account) = lastSnapshot + Σ tagged movements since that snapshot
 *
 * "Tagged movements" are only the ledger entries that name this account:
 *   - expense with sourceAccountId === account     → decreases
 *   - income  with destinationAccountId === account → increases
 *   - transfer out (sourceAccountId)                → decreases
 *   - transfer in  (destinationAccountId)           → increases
 *
 * Untagged spending never touches a live balance; it is absorbed at the next snapshot
 * (cash-transactions spec: per-account accuracy is a gradient the user controls).
 */
export interface SnapshotPoint {
  readonly value: Money
  readonly takenAt: Date
}

/** Signed effect of a single ledger entry on the given account's live balance. */
export function entryEffectOnAccount(entry: LedgerEntry, accountId: string): Money {
  switch (entry.type) {
    case 'expense':
      return entry.sourceAccountId === accountId ? entry.amount.negate() : Money.ZERO
    case 'income':
      return entry.destinationAccountId === accountId ? entry.amount : Money.ZERO
    case 'transfer': {
      let effect = Money.ZERO
      if (entry.sourceAccountId === accountId) effect = effect.minus(entry.amount)
      if (entry.destinationAccountId === accountId) effect = effect.plus(entry.amount)
      return effect
    }
  }
}

export function liveBalance(
  accountId: string,
  lastSnapshot: SnapshotPoint | undefined,
  entries: readonly LedgerEntry[],
): Money {
  const base = lastSnapshot?.value ?? Money.ZERO
  const since = lastSnapshot?.takenAt

  const movements = entries
    .filter((e) => (since ? e.date > since : true))
    .map((e) => entryEffectOnAccount(e, accountId))

  return base.plus(Money.sum(movements))
}
