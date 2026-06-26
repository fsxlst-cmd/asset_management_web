import { describe, it, expect } from 'vitest'
import { Money } from '../money'
import type { ExpenseEntry, IncomeEntry, TransferEntry } from '../entities'
import { liveBalance, entryEffectOnAccount, type SnapshotPoint } from './live-balance'

const d = (iso: string) => new Date(iso)

function expense(id: string, amount: number, date: string, sourceAccountId?: string): ExpenseEntry {
  return { id, type: 'expense', amount: Money.fromRupiah(amount), date: d(date), envelopeId: 'daily', sourceAccountId }
}
function income(id: string, amount: number, date: string, destinationAccountId?: string): IncomeEntry {
  return { id, type: 'income', amount: Money.fromRupiah(amount), date: d(date), destinationAccountId }
}
function transfer(id: string, amount: number, date: string, from: string, to: string): TransferEntry {
  return { id, type: 'transfer', amount: Money.fromRupiah(amount), date: d(date), sourceAccountId: from, destinationAccountId: to }
}

describe('live balance (derive-on-read)', () => {
  const snap: SnapshotPoint = { value: Money.fromRupiah(5_000_000), takenAt: d('2026-06-01') }

  it('starts from the last snapshot when there are no movements', () => {
    expect(liveBalance('bca', snap, []).amount).toBe(5_000_000)
  })

  it('applies only movements after the snapshot', () => {
    const entries = [
      expense('e0', 999_999, '2026-05-30', 'bca'), // before snapshot → ignored
      expense('e1', 80_000, '2026-06-02', 'bca'),
    ]
    expect(liveBalance('bca', snap, entries).amount).toBe(4_920_000)
  })

  it('ignores untagged expenses (per-account accuracy gradient)', () => {
    const entries = [expense('e1', 80_000, '2026-06-02' /* untagged */)]
    expect(liveBalance('bca', snap, entries).amount).toBe(5_000_000)
  })

  it('tagged income increases the live balance', () => {
    const entries = [income('i1', 200_000, '2026-06-03', 'bca')]
    expect(liveBalance('bca', snap, entries).amount).toBe(5_200_000)
  })

  it('transfer decreases source and increases destination', () => {
    const t = transfer('t1', 120_000, '2026-06-04', 'bca', 'gopay')
    expect(entryEffectOnAccount(t, 'bca').amount).toBe(-120_000)
    expect(entryEffectOnAccount(t, 'gopay').amount).toBe(120_000)
  })

  it('with no snapshot, accumulates from zero over all tagged entries', () => {
    const entries = [income('i1', 1_000_000, '2026-06-03', 'gopay'), expense('e1', 250_000, '2026-06-05', 'gopay')]
    expect(liveBalance('gopay', undefined, entries).amount).toBe(750_000)
  })
})
