import { Money } from '../domain/money'
import type { Account, Envelope, ExpenseEntry, Holding, LedgerEntry, Snapshot } from '../domain/entities'
import type { Repositories } from '../ports/repositories'
import type { Clock } from '../ports/clock'
import { liveBalance, entryEffectOnAccount as entryEffect, type SnapshotPoint } from '../domain/services/live-balance'
import { envelopeBalance } from '../domain/services/envelope-balance'
import { NotFoundError } from './errors'
import type {
  AccountDto,
  AccountDetailDto,
  AccountKind,
  AccountsViewDto,
  DashboardDto,
  EnvelopeDetailDto,
  EnvelopeDto,
  TransactionDto,
} from '@shared/dto'

const KIND_LABELS: Record<AccountKind, string> = {
  bank: 'Bank',
  'e-wallet': 'E-Wallet',
  cash: 'Cash',
  'prepaid-card': 'Prepaid Card',
}
const KIND_ORDER: AccountKind[] = ['bank', 'e-wallet', 'cash', 'prepaid-card']

function snapshotPoint(s: Snapshot | undefined): SnapshotPoint | undefined {
  return s ? { value: s.value, takenAt: s.takenAt } : undefined
}

/**
 * Read-side assembly of view DTOs. All account/envelope balances are derived on
 * read (design.md Decision 5) — nothing here mutates state, so it needs only the
 * repositories, not a UnitOfWork.
 */
export class ReadModel {
  constructor(
    private readonly repos: Repositories,
    private readonly clock: Clock,
  ) {}

  private entryToDto(entry: LedgerEntry, envelopeName?: string, categoryNames?: Map<string, string>): TransactionDto {
    const base: TransactionDto = {
      id: entry.id,
      type: entry.type,
      amount: entry.amount.toInt(),
      date: entry.date.toISOString(),
      note: entry.note,
    }
    if (entry.type === 'expense') {
      return {
        ...base,
        envelopeId: entry.envelopeId,
        envelopeName,
        categoryId: entry.categoryId,
        categoryName: categoryNames?.get(entry.categoryId),
        sourceAccountId: entry.sourceAccountId,
      }
    }
    if (entry.type === 'income') {
      return {
        ...base,
        categoryId: entry.categoryId,
        categoryName: categoryNames?.get(entry.categoryId),
        destinationAccountId: entry.destinationAccountId,
      }
    }
    return { ...base, sourceAccountId: entry.sourceAccountId, destinationAccountId: entry.destinationAccountId }
  }

  /** id → name for every category of both kinds (archived included, so old rows still render). */
  private async categoryNames(): Promise<Map<string, string>> {
    const [income, expense] = await Promise.all([
      this.repos.categories.list('income', { includeArchived: true }),
      this.repos.categories.list('expense', { includeArchived: true }),
    ])
    return new Map([...income, ...expense].map((c) => [c.id, c.name]))
  }

  private async accountDto(account: Account, allEntries: LedgerEntry[]): Promise<AccountDto> {
    const holdings = await this.repos.holdings.getByAccount(account.id)
    const holding = holdings[0] // phase 1: one cash holding per account
    const snapshot = holding ? await this.repos.snapshots.latestForHolding(holding.id) : undefined

    const taggedSince = allEntries.filter((e) => isTaggedTo(e, account.id))
    const base = snapshotPoint(snapshot)
    // Holding quantity already equals the last snapshot; live balance adds tagged
    // movements since. With no snapshot, fall back to the raw holding quantity.
    const balance = base
      ? liveBalance(account.id, base, taggedSince)
      : (holding?.quantity ?? Money.ZERO).plus(
          Money.sum(taggedSince.map((e) => entryEffect(e, account.id))),
        )

    const movementsSinceSnapshot = taggedSince.filter((e) => (snapshot ? e.date > snapshot.takenAt : true))
    const accuracy = movementsSinceSnapshot.length > 0 ? 'live-tracked' : 'updated-weekly'

    return {
      id: account.id,
      name: account.name,
      kind: account.kind,
      institution: account.institution,
      holdingId: holding?.id ?? null,
      balance: balance.toInt(),
      accuracy,
      lastSnapshotAt: snapshot ? snapshot.takenAt.toISOString() : null,
    }
  }

  private async envelopeDto(envelope: Envelope, expenses: ExpenseEntry[]): Promise<EnvelopeDto> {
    const balance = envelopeBalance(envelope, this.clock.now(), expenses)
    return {
      id: envelope.id,
      name: envelope.name,
      balance: balance.toInt(),
      accrual: envelope.accrual
        ? { amount: envelope.accrual.amount.toInt(), period: envelope.accrual.period }
        : undefined,
    }
  }

  async getAccountDtos(): Promise<AccountDto[]> {
    const [accounts, entries] = await Promise.all([this.repos.accounts.list(), this.repos.ledger.list()])
    return Promise.all(accounts.map((a) => this.accountDto(a, entries)))
  }

  async getDashboard(): Promise<DashboardDto> {
    const accounts = await this.getAccountDtos()
    const netWorth = accounts.reduce((sum, a) => sum + a.balance, 0)
    const lastSnapshotAt = accounts
      .map((a) => a.lastSnapshotAt)
      .filter((v): v is string => v !== null)
      .sort()
      .at(-1) ?? null

    const envelopes = await this.repos.envelopes.list()
    const primary = envelopes[0]
    let primaryEnvelope: EnvelopeDto | null = null
    if (primary) {
      const expenses = (await this.repos.ledger.list({ envelopeId: primary.id })).filter(
        (e): e is ExpenseEntry => e.type === 'expense',
      )
      primaryEnvelope = await this.envelopeDto(primary, expenses)
    }

    const envelopesById = new Map(envelopes.map((e) => [e.id, e]))
    const categoryNames = await this.categoryNames()
    const recent = (await this.repos.ledger.list()).slice(0, 5)
    const recentTransactions = recent.map((e) =>
      this.entryToDto(e, e.type === 'expense' ? envelopesById.get(e.envelopeId)?.name : undefined, categoryNames),
    )

    return { netWorth, lastSnapshotAt, accounts, primaryEnvelope, recentTransactions }
  }

  async getAccountsView(): Promise<AccountsViewDto> {
    const accounts = await this.getAccountDtos()
    const groups = KIND_ORDER.map((kind) => {
      const inKind = accounts.filter((a) => a.kind === kind)
      return {
        kind,
        label: KIND_LABELS[kind],
        subtotal: inKind.reduce((s, a) => s + a.balance, 0),
        accounts: inKind,
      }
    }).filter((g) => g.accounts.length > 0)
    const netWorth = accounts.reduce((s, a) => s + a.balance, 0)
    return { groups, netWorth }
  }

  async getAccountDetail(accountId: string): Promise<AccountDetailDto> {
    const account = await this.repos.accounts.getById(accountId)
    if (!account) throw new NotFoundError(`Account ${accountId} not found`)

    const allEntries = await this.repos.ledger.list()
    const dto = await this.accountDto(account, allEntries)
    const tagged = allEntries.filter((e) => isTaggedTo(e, accountId))

    const income = tagged
      .filter((e) => entryEffect(e, accountId).isPositive())
      .reduce((s, e) => s + entryEffect(e, accountId).toInt(), 0)
    const expense = tagged
      .filter((e) => entryEffect(e, accountId).isNegative())
      .reduce((s, e) => s + Math.abs(entryEffect(e, accountId).toInt()), 0)

    const envelopes = new Map((await this.repos.envelopes.list()).map((e) => [e.id, e.name]))
    const categoryNames = await this.categoryNames()
    const transactions = tagged.map((e) =>
      this.entryToDto(e, e.type === 'expense' ? envelopes.get(e.envelopeId) : undefined, categoryNames),
    )
    return { account: dto, income, expense, transactions }
  }

  async getBudgets(): Promise<EnvelopeDto[]> {
    const envelopes = await this.repos.envelopes.list()
    return Promise.all(
      envelopes.map(async (env) => {
        const expenses = (await this.repos.ledger.list({ envelopeId: env.id })).filter(
          (e): e is ExpenseEntry => e.type === 'expense',
        )
        return this.envelopeDto(env, expenses)
      }),
    )
  }

  async getBudgetDetail(envelopeId: string): Promise<EnvelopeDetailDto> {
    const envelope = await this.repos.envelopes.getById(envelopeId)
    if (!envelope) throw new NotFoundError(`Budget ${envelopeId} not found`)
    const entries = await this.repos.ledger.list({ envelopeId })
    const expenses = entries.filter((e): e is ExpenseEntry => e.type === 'expense')
    const categoryNames = await this.categoryNames()
    return {
      envelope: await this.envelopeDto(envelope, expenses),
      transactions: entries.map((e) => this.entryToDto(e, envelope.name, categoryNames)),
    }
  }
}

// ── helpers (shared with live-balance semantics) ─────────────────────────────

function isTaggedTo(entry: LedgerEntry, accountId: string): boolean {
  switch (entry.type) {
    case 'expense':
      return entry.sourceAccountId === accountId
    case 'income':
      return entry.destinationAccountId === accountId
    case 'transfer':
      return entry.sourceAccountId === accountId || entry.destinationAccountId === accountId
  }
}
