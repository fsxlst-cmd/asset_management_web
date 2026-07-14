import { describe, it, expect, beforeEach } from 'vitest'
import { Money } from '../domain/money'
import type { Category, LedgerEntry } from '../domain/entities'
import { InMemoryDatabase, FakeClock } from '../testing/in-memory'
import { ReadModel } from './read-model'

// Mid-month WIB instants (05:00Z = 12:00 WIB) keep entries unambiguously inside their month.
const JUN = '2026-06-15T05:00:00Z'
const MAY = '2026-05-15T05:00:00Z'

let id = 0
function expense(categoryId: string, amount: number, iso: string): LedgerEntry {
  return {
    id: `e${id++}`,
    type: 'expense',
    amount: Money.fromRupiah(amount),
    date: new Date(iso),
    envelopeId: 'env',
    categoryId,
  }
}

describe('ReadModel.getSpendingReport', () => {
  let db: InMemoryDatabase
  let read: ReadModel

  const categories: Category[] = [
    { id: 'dining', name: 'Dining', kind: 'expense' },
    { id: 'groceries', name: 'Groceries', kind: 'expense' },
    { id: 'transport', name: 'Transport', kind: 'expense' },
    { id: 'bills', name: 'Bills', kind: 'expense' },
    { id: 'fun', name: 'Entertainment', kind: 'expense' },
  ]

  beforeEach(() => {
    id = 0
    db = new InMemoryDatabase()
    db.store.categories.push(...categories)
    read = new ReadModel(db.repos, new FakeClock(new Date(JUN)))
  })

  it('sums per category, ranks by spend, computes shares, and excludes income/transfers', async () => {
    db.store.ledger.push(
      expense('dining', 700_000, JUN),
      expense('dining', 500_000, JUN), // Dining = 1,200,000
      expense('groceries', 880_000, JUN),
      expense('transport', 450_000, JUN),
      // Not expenses → must be ignored.
      { id: 'i1', type: 'income', amount: Money.fromRupiah(9_000_000), date: new Date(JUN), categoryId: 'salary' },
      {
        id: 't1',
        type: 'transfer',
        amount: Money.fromRupiah(1_000_000),
        date: new Date(JUN),
        sourceAccountId: 'a',
        destinationAccountId: 'b',
      },
    )

    const r = await read.getSpendingReport({ year: 2026, month: 6 })

    expect(r.total).toBe(2_530_000)
    expect(r.rows.map((x) => x.categoryName)).toEqual(['Dining', 'Groceries', 'Transport'])
    expect(r.rows[0]!.amount).toBe(1_200_000)
    expect(r.rows[0]!.share).toBeCloseTo(1_200_000 / 2_530_000, 5)
  })

  it('chooses percentage, absolute, or NEW for each category delta', async () => {
    db.store.ledger.push(
      // Dining: 800k last month → 1,160,000 this month ⇒ +45%
      expense('dining', 800_000, MAY),
      expense('dining', 1_160_000, JUN),
      // Transport: tiny base 5,000 → 200,000 ⇒ absolute +195,000
      expense('transport', 5_000, MAY),
      expense('transport', 200_000, JUN),
      // Groceries: nothing last month ⇒ NEW
      expense('groceries', 300_000, JUN),
    )

    const r = await read.getSpendingReport({ year: 2026, month: 6 })
    const byName = Object.fromEntries(r.rows.map((x) => [x.categoryName, x]))

    expect(byName.Dining!.deltaKind).toBe('percent')
    expect(byName.Dining!.deltaPercent).toBeCloseTo(0.45, 5)
    expect(byName.Transport!.deltaKind).toBe('absolute')
    expect(byName.Transport!.deltaAbsolute).toBe(195_000)
    expect(byName.Groceries!.deltaKind).toBe('new')
    expect(byName.Groceries!.deltaPercent).toBeUndefined()
  })

  it('surfaces categories that went quiet and the month-total delta', async () => {
    db.store.ledger.push(
      expense('fun', 320_000, MAY), // quiet this month
      expense('dining', 2_800_000, MAY),
      expense('dining', 3_140_000, JUN),
    )

    const r = await read.getSpendingReport({ year: 2026, month: 6 })

    expect(r.quiet).toEqual([{ categoryId: 'fun', categoryName: 'Entertainment', lastMonth: 320_000 }])
    expect(r.rows.some((x) => x.categoryName === 'Entertainment')).toBe(false)
    // total 3,140,000 vs last 3,120,000 (dining 2.8M + fun 320k)
    expect(r.totalLastMonth).toBe(3_120_000)
    expect(r.totalDeltaPercent).toBeCloseTo((3_140_000 - 3_120_000) / 3_120_000, 5)
  })

  it('buckets an expense with an unresolvable category under Uncategorised without persisting it', async () => {
    db.store.ledger.push(expense('ghost', 50_000, JUN), expense('', 25_000, JUN))

    const r = await read.getSpendingReport({ year: 2026, month: 6 })

    const uncat = r.rows.find((x) => x.categoryName === 'Uncategorised')
    expect(uncat!.amount).toBe(75_000)
    expect(r.total).toBe(75_000)
    expect(db.store.categories.some((c) => c.name === 'Uncategorised')).toBe(false)
  })

  it('returns zero total and no rows for a month with no expenses', async () => {
    db.store.ledger.push(expense('dining', 100_000, MAY)) // prior month only

    const r = await read.getSpendingReport({ year: 2026, month: 6 })

    expect(r.total).toBe(0)
    expect(r.rows).toEqual([])
    // Prior month had spend, so the month-over-month delta is a full -100% drop.
    expect(r.totalDeltaPercent).toBe(-1)
    expect(r.quiet.map((q) => q.categoryName)).toEqual(['Dining'])
  })
})
