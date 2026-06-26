import { Money } from '../domain/money'
import type { Account, AccountKind, CategoryKind, ExpenseEntry, IncomeEntry, TransferEntry, Snapshot, Holding } from '../domain/entities'
import type { UnitOfWork } from '../ports/unit-of-work'
import type { Repositories } from '../ports/repositories'
import type { Clock } from '../ports/clock'
import type { IdGenerator } from '../ports/id-generator'
import { NotFoundError, ValidationError } from './errors'

const CASH_ASSET_ID = 'cash'

interface Deps {
  readonly uow: UnitOfWork
  readonly clock: Clock
  readonly ids: IdGenerator
}

function assertPositive(amount: Money, label: string): void {
  if (!amount.isPositive()) {
    throw new ValidationError(`${label} must be a positive amount`)
  }
}

/**
 * A category assigned to an income/expense entry must exist, match the entry kind,
 * and be active (not archived). Enforced here so the rule lives in one place
 * (transaction-categories spec).
 */
async function assertCategory(repos: Repositories, categoryId: string, kind: CategoryKind): Promise<void> {
  const category = await repos.categories.getById(categoryId)
  if (!category) throw new NotFoundError(`Category ${categoryId} not found`)
  if (category.kind !== kind) throw new ValidationError(`"${category.name}" is not a ${kind} category`)
  if (category.archivedAt) throw new ValidationError(`Category "${category.name}" is archived`)
}

// ── Create account ───────────────────────────────────────────────────────────

export interface CreateAccountInput {
  name: string
  kind: AccountKind
  institution?: string
  /** Optional opening balance, recorded as the first snapshot. */
  initialBalance?: number
}

export class CreateAccount {
  constructor(private readonly deps: Deps) {}

  async execute(input: CreateAccountInput): Promise<{ accountId: string; holdingId: string }> {
    if (!input.name.trim()) throw new ValidationError('Account name is required')

    return this.deps.uow.transaction(async (repos) => {
      const accountId = this.deps.ids.next()
      const holdingId = this.deps.ids.next()
      const opening = Money.fromInt(input.initialBalance ?? 0)

      const account: Account = {
        id: accountId,
        name: input.name.trim(),
        kind: input.kind,
        institution: input.institution?.trim() || undefined,
      }
      const holding: Holding = { id: holdingId, accountId, assetId: CASH_ASSET_ID, quantity: opening }

      await repos.accounts.create(account)
      await repos.holdings.create(holding)

      if (!opening.isZero()) {
        const snapshot: Snapshot = { id: this.deps.ids.next(), holdingId, value: opening, takenAt: this.deps.clock.now() }
        await repos.snapshots.add(snapshot)
      }
      return { accountId, holdingId }
    })
  }
}

// ── Log expense ──────────────────────────────────────────────────────────────

export interface LogExpenseInput {
  amount: number
  envelopeId: string
  categoryId: string
  sourceAccountId?: string
  date?: Date
  note?: string
}

export class LogExpense {
  constructor(private readonly deps: Deps) {}

  async execute(input: LogExpenseInput): Promise<{ id: string }> {
    const amount = Money.fromInt(input.amount)
    assertPositive(amount, 'Expense amount')

    return this.deps.uow.transaction(async (repos) => {
      const envelope = await repos.envelopes.getById(input.envelopeId)
      if (!envelope) throw new NotFoundError(`Budget ${input.envelopeId} not found`)

      await assertCategory(repos, input.categoryId, 'expense')

      if (input.sourceAccountId) {
        const account = await repos.accounts.getById(input.sourceAccountId)
        if (!account) throw new NotFoundError(`Account ${input.sourceAccountId} not found`)
      }

      const entry: ExpenseEntry = {
        id: this.deps.ids.next(),
        type: 'expense',
        amount,
        date: input.date ?? this.deps.clock.now(),
        note: input.note?.trim() || undefined,
        envelopeId: input.envelopeId,
        categoryId: input.categoryId,
        sourceAccountId: input.sourceAccountId,
      }
      await repos.ledger.add(entry)
      return { id: entry.id }
    })
  }
}

// ── Log income ───────────────────────────────────────────────────────────────

export interface LogIncomeInput {
  amount: number
  categoryId: string
  destinationAccountId?: string
  date?: Date
  note?: string
}

export class LogIncome {
  constructor(private readonly deps: Deps) {}

  async execute(input: LogIncomeInput): Promise<{ id: string }> {
    const amount = Money.fromInt(input.amount)
    assertPositive(amount, 'Income amount')

    return this.deps.uow.transaction(async (repos) => {
      await assertCategory(repos, input.categoryId, 'income')

      if (input.destinationAccountId) {
        const account = await repos.accounts.getById(input.destinationAccountId)
        if (!account) throw new NotFoundError(`Account ${input.destinationAccountId} not found`)
      }
      const entry: IncomeEntry = {
        id: this.deps.ids.next(),
        type: 'income',
        amount,
        date: input.date ?? this.deps.clock.now(),
        note: input.note?.trim() || undefined,
        categoryId: input.categoryId,
        destinationAccountId: input.destinationAccountId,
      }
      await repos.ledger.add(entry)
      return { id: entry.id }
    })
  }
}

// ── Record transfer ──────────────────────────────────────────────────────────

export interface RecordTransferInput {
  amount: number
  sourceAccountId: string
  destinationAccountId: string
  date?: Date
  note?: string
}

export class RecordTransfer {
  constructor(private readonly deps: Deps) {}

  async execute(input: RecordTransferInput): Promise<{ id: string }> {
    const amount = Money.fromInt(input.amount)
    assertPositive(amount, 'Transfer amount')
    if (input.sourceAccountId === input.destinationAccountId) {
      throw new ValidationError('Transfer source and destination must differ')
    }

    return this.deps.uow.transaction(async (repos) => {
      const [from, to] = await Promise.all([
        repos.accounts.getById(input.sourceAccountId),
        repos.accounts.getById(input.destinationAccountId),
      ])
      if (!from) throw new NotFoundError(`Account ${input.sourceAccountId} not found`)
      if (!to) throw new NotFoundError(`Account ${input.destinationAccountId} not found`)

      const entry: TransferEntry = {
        id: this.deps.ids.next(),
        type: 'transfer',
        amount,
        date: input.date ?? this.deps.clock.now(),
        note: input.note?.trim() || undefined,
        sourceAccountId: input.sourceAccountId,
        destinationAccountId: input.destinationAccountId,
      }
      await repos.ledger.add(entry)
      return { id: entry.id }
    })
  }
}

// ── Snapshots / reconciliation ───────────────────────────────────────────────

export interface SnapshotEntryInput {
  holdingId: string
  value: number
}

/** Set one holding's quantity to a user-entered real balance and record the snapshot. */
export class TakeSnapshot {
  constructor(private readonly deps: Deps) {}

  async execute(input: SnapshotEntryInput): Promise<void> {
    const value = Money.fromInt(input.value)
    if (value.isNegative()) throw new ValidationError('A real balance cannot be negative')

    await this.deps.uow.transaction(async (repos) => {
      const holding = await repos.holdings.getById(input.holdingId)
      if (!holding) throw new NotFoundError(`Holding ${input.holdingId} not found`)

      const now = this.deps.clock.now()
      await repos.holdings.setQuantity(input.holdingId, value)
      await repos.snapshots.add({ id: this.deps.ids.next(), holdingId: input.holdingId, value, takenAt: now })
    })
  }
}

/** Submit several real balances at once (weekly reconciliation), atomically. */
export class SubmitReconciliation {
  constructor(private readonly deps: Deps) {}

  async execute(entries: SnapshotEntryInput[]): Promise<void> {
    if (entries.length === 0) throw new ValidationError('Reconciliation needs at least one balance')
    for (const e of entries) {
      if (Money.fromInt(e.value).isNegative()) throw new ValidationError('A real balance cannot be negative')
    }

    await this.deps.uow.transaction(async (repos) => {
      const now = this.deps.clock.now()
      for (const e of entries) {
        const holding = await repos.holdings.getById(e.holdingId)
        if (!holding) throw new NotFoundError(`Holding ${e.holdingId} not found`)
        const value = Money.fromInt(e.value)
        await repos.holdings.setQuantity(e.holdingId, value)
        await repos.snapshots.add({ id: this.deps.ids.next(), holdingId: e.holdingId, value, takenAt: now })
      }
    })
  }
}
