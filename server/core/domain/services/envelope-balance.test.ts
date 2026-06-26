import { describe, it, expect } from 'vitest'
import { Money } from '../money'
import type { Envelope, ExpenseEntry } from '../entities'
import { envelopeBalance } from './envelope-balance'

const d = (iso: string) => new Date(iso)

// Anchor at 12:00 WIB Jun 1 (05:00Z); readings use mid-day WIB instants.
const daily: Envelope = {
  id: 'daily',
  name: 'Daily Spending',
  accrual: { amount: Money.fromRupiah(100_000), period: 'day', anchor: d('2026-06-01T05:00:00Z') },
}

function expense(id: string, amount: number, date: string): ExpenseEntry {
  return { id, type: 'expense', amount: Money.fromRupiah(amount), date: d(date), envelopeId: 'daily' }
}

describe('envelope balance (accrued − assigned expenses)', () => {
  it('equals total accruals minus assigned expenses', () => {
    // Day 1 only (10:00Z = 17:00 WIB Jun 1): accrued 100k, spent 60k → 40k.
    const balance = envelopeBalance(daily, d('2026-06-01T10:00:00Z'), [expense('e1', 60_000, '2026-06-01')])
    expect(balance.amount).toBe(40_000)
  })

  it('carries the remainder forward automatically', () => {
    // Day 1: +100k, spent 60k. Day 2 (12:00 WIB Jun 2): +100k → available 140k.
    const balance = envelopeBalance(daily, d('2026-06-02T05:00:00Z'), [expense('e1', 60_000, '2026-06-01')])
    expect(balance.amount).toBe(140_000)
  })

  it('goes negative when overspent and recovers with the next accrual', () => {
    // Day 1: accrued 100k, spent 120k → −20k.
    const day1 = envelopeBalance(daily, d('2026-06-01T10:00:00Z'), [expense('e1', 120_000, '2026-06-01')])
    expect(day1.amount).toBe(-20_000)
    expect(day1.isNegative()).toBe(true)

    // Day 2: +100k → 80k.
    const day2 = envelopeBalance(daily, d('2026-06-02T05:00:00Z'), [expense('e1', 120_000, '2026-06-01')])
    expect(day2.amount).toBe(80_000)
  })

  it('an envelope without an accrual rule is just the negative of what was spent', () => {
    const adhoc: Envelope = { id: 'x', name: 'Ad hoc' }
    expect(envelopeBalance(adhoc, d('2026-06-05'), [expense('e1', 30_000, '2026-06-02')]).amount).toBe(-30_000)
  })
})
