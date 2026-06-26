import { Money } from '../domain/money'
import type { Repositories } from '../ports/repositories'
import { crossCheck } from '../domain/services/cross-check'
import type { CrossCheckDto } from '@shared/dto'

export interface RunCrossCheckInput {
  periodStart: Date
  periodEnd: Date
}

/**
 * Compares the snapshot-based net-worth change against logged cashflow for a period
 * (reconciliation spec). Net worth at each boundary is the sum, over all holdings, of
 * the most recent snapshot value as-of that instant — so it reflects the user-entered
 * real balances, not the live estimate.
 */
export class RunCrossCheck {
  constructor(private readonly repos: Repositories) {}

  private async netWorthAsOf(asOf: Date): Promise<Money> {
    const holdings = await this.repos.holdings.list()
    const values = await Promise.all(
      holdings.map(async (h) => {
        const snap = await this.repos.snapshots.latestForHolding(h.id, asOf)
        return snap?.value ?? Money.ZERO
      }),
    )
    return Money.sum(values)
  }

  async execute(input: RunCrossCheckInput): Promise<CrossCheckDto> {
    const [netWorthStart, netWorthEnd, entriesInPeriod] = await Promise.all([
      this.netWorthAsOf(input.periodStart),
      this.netWorthAsOf(input.periodEnd),
      this.repos.ledger.list({ from: input.periodStart, to: input.periodEnd }),
    ])

    const r = crossCheck({ netWorthStart, netWorthEnd, entriesInPeriod })
    return {
      netWorthChange: r.netWorthChange.toInt(),
      loggedIncome: r.loggedIncome.toInt(),
      loggedExpense: r.loggedExpense.toInt(),
      loggedNetFlow: r.loggedNetFlow.toInt(),
      untracked: r.untracked.toInt(),
      status: r.status,
      loggingAccuracy: r.loggingAccuracy,
    }
  }
}
