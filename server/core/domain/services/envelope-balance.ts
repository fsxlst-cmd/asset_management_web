import { Money } from '../money'
import type { Envelope, ExpenseEntry } from '../entities'
import { accruedSoFar } from './accrual'

/**
 * Envelope running balance (budget-envelopes spec, design.md Decision 5):
 *
 *   balance = accruedSoFar − Σ expenses assigned to the envelope
 *
 * - Carryover is automatic: the envelope is never reset, so unspent accruals simply
 *   remain in the running total.
 * - The balance MAY go negative when expenses exceed accruals (borrowing against
 *   future accruals); subsequent accruals bring it back toward zero.
 * - An envelope without an accrual rule accrues nothing; its balance is just the
 *   negative of whatever has been spent against it.
 */
export function envelopeBalance(
  envelope: Envelope,
  asOf: Date,
  assignedExpenses: readonly ExpenseEntry[],
): Money {
  const accrued = envelope.accrual ? accruedSoFar(envelope.accrual, asOf) : Money.ZERO
  const spent = Money.sum(assignedExpenses.map((e) => e.amount))
  return accrued.minus(spent)
}
