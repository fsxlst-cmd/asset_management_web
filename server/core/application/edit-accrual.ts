import { Money } from '../domain/money'
import type { AccrualPeriod, AccrualRule } from '../domain/entities'
import { accruedSoFar } from '../domain/services/accrual'
import type { UnitOfWork } from '../ports/unit-of-work'
import type { Clock } from '../ports/clock'
import { NotFoundError, ValidationError } from './errors'

export interface EditAccrualInput {
  envelopeId: string
  amount: number
  period: AccrualPeriod
}

/**
 * Change an envelope's accrual rate without rewriting the past (budget-envelopes spec).
 * The envelope re-anchors: everything accrued so far at the old rate is frozen into
 * the new rule's baseline, and the new anchor is "now" so only future accruals use the
 * new rate.
 */
export class EditAccrual {
  constructor(
    private readonly deps: { uow: UnitOfWork; clock: Clock },
  ) {}

  async execute(input: EditAccrualInput): Promise<void> {
    const amount = Money.fromInt(input.amount)
    if (!amount.isPositive()) throw new ValidationError('Accrual amount must be positive')

    await this.deps.uow.transaction(async (repos) => {
      const envelope = await repos.envelopes.getById(input.envelopeId)
      if (!envelope) throw new NotFoundError(`Budget ${input.envelopeId} not found`)

      const now = this.deps.clock.now()
      const frozen = envelope.accrual ? accruedSoFar(envelope.accrual, now) : Money.ZERO

      const next: AccrualRule = { amount, period: input.period, anchor: now, baseline: frozen }
      await repos.envelopes.setAccrual(input.envelopeId, next)
    })
  }
}
