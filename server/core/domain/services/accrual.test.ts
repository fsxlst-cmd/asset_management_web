import { describe, it, expect } from 'vitest'
import { Money } from '../money'
import type { AccrualRule } from '../entities'
import { periodsElapsed, accruedSoFar } from './accrual'

const d = (iso: string) => new Date(iso)

// Day boundaries are WIB (UTC+7). To keep tests unambiguous, anchors/readings use
// mid-day WIB instants (e.g. 05:00Z = 12:00 WIB) unless a boundary is being tested.
describe('accrual (lazy rate × periods, WIB day boundaries)', () => {
  // 05:00Z on Jun 1 = 12:00 WIB Jun 1.
  const daily: AccrualRule = { amount: Money.fromRupiah(100_000), period: 'day', anchor: d('2026-06-01T05:00:00Z') }

  it('counts the anchor day as the first accrual', () => {
    expect(periodsElapsed('day', d('2026-06-01T05:00:00Z'), d('2026-06-01T09:00:00Z'))).toBe(1)
    expect(accruedSoFar(daily, d('2026-06-01T10:00:00Z')).amount).toBe(100_000)
  })

  it('rolls over at WIB local midnight (00:00 WIB = 17:00 UTC), not 00:00 UTC', () => {
    // 16:59Z Jun 1 = 23:59 WIB Jun 1 → still day 1.
    expect(accruedSoFar(daily, d('2026-06-01T16:59:00Z')).amount).toBe(100_000)
    // 17:00Z Jun 1 = 00:00 WIB Jun 2 → day 2.
    expect(accruedSoFar(daily, d('2026-06-01T17:00:00Z')).amount).toBe(200_000)
    // Sanity: 00:00 UTC Jun 2 (07:00 WIB Jun 2) is still the same WIB day as 17:00Z.
    expect(accruedSoFar(daily, d('2026-06-02T00:00:00Z')).amount).toBe(200_000)
  })

  it('adds one accrual per elapsed WIB day', () => {
    expect(accruedSoFar(daily, d('2026-06-02T05:00:00Z')).amount).toBe(200_000)
    expect(accruedSoFar(daily, d('2026-06-08T05:00:00Z')).amount).toBe(800_000)
  })

  it('returns zero before the anchor day', () => {
    expect(periodsElapsed('day', d('2026-06-10T05:00:00Z'), d('2026-06-01T05:00:00Z'))).toBe(0)
    expect(accruedSoFar(daily, d('2026-05-20T05:00:00Z')).amount).toBe(0)
  })

  it('a frozen baseline preserves past accruals when the rate changes (re-anchor)', () => {
    // After 2 days at 100k (=200k accrued), the user raises the rate to 120k. The
    // envelope re-anchors: baseline freezes the 200k, the new anchor is the change time.
    const reAnchored: AccrualRule = {
      amount: Money.fromRupiah(120_000),
      period: 'day',
      anchor: d('2026-06-03T05:00:00Z'),
      baseline: Money.fromRupiah(200_000),
    }
    // On the change day: 200k baseline + 120k (anchor day counts once).
    expect(accruedSoFar(reAnchored, d('2026-06-03T09:00:00Z')).amount).toBe(320_000)
    // Next day: 200k + 120k×2 = 440k. Past accruals stayed at the old 100k rate.
    expect(accruedSoFar(reAnchored, d('2026-06-04T05:00:00Z')).amount).toBe(440_000)
  })

  it('supports weekly and monthly periods', () => {
    const weekly: AccrualRule = { amount: Money.fromRupiah(700_000), period: 'week', anchor: d('2026-06-01T05:00:00Z') }
    expect(accruedSoFar(weekly, d('2026-06-08T05:00:00Z')).amount).toBe(1_400_000) // anchor week + 1

    const monthly: AccrualRule = { amount: Money.fromRupiah(4_500_000), period: 'month', anchor: d('2026-06-01T05:00:00Z') }
    expect(accruedSoFar(monthly, d('2026-07-01T05:00:00Z')).amount).toBe(9_000_000) // anchor month + 1
  })
})
