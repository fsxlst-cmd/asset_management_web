import { describe, it, expect } from 'vitest'
import { Money } from '../money'
import type { ExpenseEntry, IncomeEntry, LedgerEntry } from '../entities'
import { crossCheck, accountDrift } from './cross-check'
import type { SnapshotPoint } from './live-balance'

const d = (iso: string) => new Date(iso)
const rp = Money.fromRupiah

function expense(id: string, amount: number, source?: string): ExpenseEntry {
  return { id, type: 'expense', amount: rp(amount), date: d('2026-06-15'), envelopeId: 'daily', categoryId: 'food', sourceAccountId: source }
}
function income(id: string, amount: number): IncomeEntry {
  return { id, type: 'income', amount: rp(amount), date: d('2026-06-15'), categoryId: 'salary' }
}

describe('cross-check', () => {
  it('reports complete when net-worth change equals logged net flow', () => {
    const r = crossCheck({ netWorthStart: rp(10_000_000), netWorthEnd: rp(9_500_000), entriesInPeriod: [expense('e1', 500_000)] })
    expect(r.untracked.amount).toBe(0)
    expect(r.status).toBe('complete')
    expect(r.loggingAccuracy).toBe(100)
  })

  it('detects untracked spending (the spec/mockup example)', () => {
    // Net worth dropped 1.200.000, logged 980.000 of spending → ~220.000 untracked.
    const r = crossCheck({ netWorthStart: rp(14_250_000), netWorthEnd: rp(13_050_000), entriesInPeriod: [expense('e1', 980_000)] })
    expect(r.netWorthChange.amount).toBe(-1_200_000)
    expect(r.untracked.amount).toBe(220_000)
    expect(r.status).toBe('untracked-spending')
    expect(r.loggingAccuracy).toBe(82) // 1 - 220/1200 ≈ 0.817
  })

  it('detects unexplained income when net worth rose more than logged', () => {
    const r = crossCheck({ netWorthStart: rp(5_000_000), netWorthEnd: rp(6_000_000), entriesInPeriod: [income('i1', 800_000)] })
    expect(r.untracked.amount).toBe(-200_000)
    expect(r.status).toBe('unexplained-income')
  })

  it('excludes transfers from the logged flow', () => {
    const entries: LedgerEntry[] = [
      { id: 't1', type: 'transfer', amount: rp(1_000_000), date: d('2026-06-15'), sourceAccountId: 'bca', destinationAccountId: 'gopay' },
    ]
    const r = crossCheck({ netWorthStart: rp(5_000_000), netWorthEnd: rp(5_000_000), entriesInPeriod: entries })
    expect(r.loggedNetFlow.amount).toBe(0)
    expect(r.status).toBe('complete')
  })

  describe('account drift (tagging narrows the gap)', () => {
    const snap: SnapshotPoint = { value: rp(1_000_000), takenAt: d('2026-06-01') }
    const realBalanceNow = rp(700_000) // user spent 300k from this account in reality

    it('full drift when the spending was untagged', () => {
      const untagged = [expense('e1', 300_000 /* no source account */)]
      expect(accountDrift('bca', snap, untagged, realBalanceNow).amount).toBe(-300_000)
    })

    it('zero drift when the same spending was tagged to the account', () => {
      const tagged = [expense('e1', 300_000, 'bca')]
      expect(accountDrift('bca', snap, tagged, realBalanceNow).amount).toBe(0)
    })
  })
})
