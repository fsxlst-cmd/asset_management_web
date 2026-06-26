import { Money } from '../domain/money'
import type { AccrualPeriod, AccrualRule, Envelope } from '../domain/entities'
import type { UnitOfWork } from '../ports/unit-of-work'
import type { Clock } from '../ports/clock'
import type { IdGenerator } from '../ports/id-generator'
import { NotFoundError, ValidationError } from './errors'

interface Deps {
  readonly uow: UnitOfWork
  readonly clock: Clock
  readonly ids: IdGenerator
}

export interface CreateEnvelopeInput {
  name: string
  /** Optional recurring accrual. Anchored at "now" so day 1 is the first accrual. */
  accrual?: { amount: number; period: AccrualPeriod }
}

/** Create a budget envelope (budget-envelopes spec — envelopes are user-managed). */
export class CreateEnvelope {
  constructor(private readonly deps: Deps) {}

  async execute(input: CreateEnvelopeInput): Promise<{ id: string }> {
    if (!input.name.trim()) throw new ValidationError('Budget name is required')

    let accrual: AccrualRule | undefined
    if (input.accrual) {
      const amount = Money.fromInt(input.accrual.amount)
      if (!amount.isPositive()) throw new ValidationError('Accrual amount must be positive')
      accrual = { amount, period: input.accrual.period, anchor: this.deps.clock.now() }
    }

    return this.deps.uow.transaction(async (repos) => {
      const envelope: Envelope = { id: this.deps.ids.next(), name: input.name.trim(), accrual }
      await repos.envelopes.create(envelope)
      return { id: envelope.id }
    })
  }
}

/**
 * Delete a budget envelope. Refuses if expenses are charged to it, so spending
 * history is never silently orphaned (the spec requires every expense to have a
 * valid budget). Clear the expenses first, or keep the envelope.
 */
export class DeleteEnvelope {
  constructor(private readonly deps: { uow: UnitOfWork }) {}

  async execute(envelopeId: string): Promise<void> {
    await this.deps.uow.transaction(async (repos) => {
      const envelope = await repos.envelopes.getById(envelopeId)
      if (!envelope) throw new NotFoundError(`Budget ${envelopeId} not found`)

      const charged = await repos.ledger.list({ envelopeId })
      if (charged.length > 0) {
        throw new ValidationError(
          `Cannot delete "${envelope.name}": ${charged.length} expense(s) are charged to it`,
        )
      }
      await repos.envelopes.delete(envelopeId)
    })
  }
}
