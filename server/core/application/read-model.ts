import { Money } from '../domain/money'
import type { Account, Envelope, ExpenseEntry, Holding, LedgerEntry, Snapshot } from '../domain/entities'
import type { Repositories } from '../ports/repositories'
import type { Clock } from '../ports/clock'
import { liveBalance, entryEffectOnAccount as entryEffect, type SnapshotPoint } from '../domain/services/live-balance'
import { envelopeBalance } from '../domain/services/envelope-balance'
import { monthRange, previousMonth, isInMonth, type YearMonth } from '../domain/services/month-range'
import { NotFoundError } from './errors'
import type {
  AccountDto,
  AccountDetailDto,
  AccountKind,
  AccountsViewDto,
  DashboardDto,
  EnvelopeDetailDto,
  EnvelopeDto,
  SpendingCategoryRowDto,
  SpendingReportDto,
  TransactionDto,
} from '@shared/dto'

/**
 * Below this prior-month base (rupiah), a percentage change is noise — a category that
 * went from 5,000 to 200,000 should read "+195k", not "▲3900%". The report switches to
 * an absolute delta at or under this threshold. Tunable in one place.
 */
const TINY_BASE_THRESHOLD = 50_000

/** Synthetic bucket for expenses whose category cannot be resolved (display only, never persisted). */
const UNCATEGORISED_ID = '__uncategorised__'
const UNCATEGORISED_NAME = 'Uncategorised'

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

  /**
   * id → name for categories (archived included, so old rows still render). Pass a
   * single kind to skip fetching the other list when only one is needed (e.g. a
   * budget's entries are all expenses); omit it to resolve both income and expense.
   */
  private async categoryNames(kind?: 'income' | 'expense'): Promise<Map<string, string>> {
    const lists = await Promise.all(
      (kind ? [kind] : (['income', 'expense'] as const)).map((k) =>
        this.repos.categories.list(k, { includeArchived: true }),
      ),
    )
    return new Map(lists.flat().map((c) => [c.id, c.name]))
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
    // Entries here are all expenses (filtered by envelopeId), so only expense categories are needed.
    const categoryNames = await this.categoryNames('expense')
    return {
      envelope: await this.envelopeDto(envelope, expenses),
      transactions: entries.map((e) => this.entryToDto(e, envelope.name, categoryNames)),
    }
  }

  /**
   * Spending report for one WIB calendar month: expenses aggregated by category, ranked
   * by spend, each with its share of the month total and a comparison to the same category
   * in the previous month. Income and transfers are excluded. Computed entirely on read.
   */
  async getSpendingReport(ym: YearMonth): Promise<SpendingReportDto> {
    const [entries, categoryNames] = await Promise.all([this.repos.ledger.list(), this.categoryNames('expense')])
    const expenses = entries.filter((e): e is ExpenseEntry => e.type === 'expense')

    const thisRange = monthRange(ym)
    const lastRange = monthRange(previousMonth(ym))
    const thisTotals = sumByCategory(expenses, thisRange, categoryNames)
    const lastTotals = sumByCategory(expenses, lastRange, categoryNames)

    const total = sumValues(thisTotals)
    const totalLastMonth = sumValues(lastTotals)

    const nameFor = (id: string) =>
      id === UNCATEGORISED_ID ? UNCATEGORISED_NAME : (categoryNames.get(id) ?? UNCATEGORISED_NAME)

    const rows: SpendingCategoryRowDto[] = [...thisTotals.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([categoryId, amount]) => {
        const lastMonth = lastTotals.get(categoryId) ?? 0
        return {
          categoryId,
          categoryName: nameFor(categoryId),
          amount,
          share: total > 0 ? amount / total : 0,
          thisMonth: amount,
          lastMonth,
          ...deltaFor(amount, lastMonth),
        }
      })

    const quiet = [...lastTotals.entries()]
      .filter(([id]) => !thisTotals.has(id))
      .sort((a, b) => b[1] - a[1])
      .map(([categoryId, lastMonth]) => ({ categoryId, categoryName: nameFor(categoryId), lastMonth }))

    return {
      month: `${ym.year}-${String(ym.month).padStart(2, '0')}`,
      total,
      totalLastMonth,
      totalDeltaPercent: totalLastMonth > 0 ? (total - totalLastMonth) / totalLastMonth : undefined,
      rows,
      quiet,
    }
  }
}

/**
 * Sum expense amounts (rupiah) per category id within a WIB month range. A category
 * that is missing or not present in `names` (e.g. a legacy/imported row) folds into a
 * single synthetic "Uncategorised" bucket rather than forming its own row.
 */
function sumByCategory(
  expenses: ExpenseEntry[],
  range: { start: Date; end: Date },
  names: Map<string, string>,
): Map<string, number> {
  const totals = new Map<string, number>()
  for (const e of expenses) {
    if (!isInMonth(e.date, range)) continue
    const key = e.categoryId && names.has(e.categoryId) ? e.categoryId : UNCATEGORISED_ID
    totals.set(key, (totals.get(key) ?? 0) + e.amount.toInt())
  }
  return totals
}

function sumValues(totals: Map<string, number>): number {
  let sum = 0
  for (const v of totals.values()) sum += v
  return sum
}

/**
 * The delta fields for a category row. Percentage against a real base; absolute rupiah
 * when last month was tiny (≤ threshold) so a near-zero base doesn't yield a huge %;
 * 'new' when the category had no spend last month.
 */
function deltaFor(
  thisMonth: number,
  lastMonth: number,
): Pick<SpendingCategoryRowDto, 'deltaKind' | 'deltaPercent' | 'deltaAbsolute'> {
  if (lastMonth === 0) return { deltaKind: 'new' }
  if (lastMonth <= TINY_BASE_THRESHOLD) return { deltaKind: 'absolute', deltaAbsolute: thisMonth - lastMonth }
  return { deltaKind: 'percent', deltaPercent: (thisMonth - lastMonth) / lastMonth }
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
