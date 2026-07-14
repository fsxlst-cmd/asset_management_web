import { describe, it, expect } from 'vitest'
import { monthRange, previousMonth, isInMonth } from './month-range'

const d = (iso: string) => new Date(iso)

// WIB is UTC+7, so WIB midnight on the 1st = 17:00 UTC on the last day of the prior
// month. June 2026 therefore spans [May 31 17:00Z, Jun 30 17:00Z).
describe('monthRange (WIB calendar month, half-open)', () => {
  it('starts and ends at WIB local midnight (17:00 UTC the day before)', () => {
    const { start, end } = monthRange({ year: 2026, month: 6 })
    expect(start.toISOString()).toBe('2026-05-31T17:00:00.000Z')
    expect(end.toISOString()).toBe('2026-06-30T17:00:00.000Z')
  })

  it('counts a late-night last-day expense in its WIB month', () => {
    const june = monthRange({ year: 2026, month: 6 })
    const july = monthRange({ year: 2026, month: 7 })
    // Jun 30 23:30 WIB = Jun 30 16:30 UTC.
    const lateNight = d('2026-06-30T16:30:00Z')
    expect(isInMonth(lateNight, june)).toBe(true)
    expect(isInMonth(lateNight, july)).toBe(false)
  })

  it('places an expense at exactly next-month 00:00 WIB in the new month', () => {
    const june = monthRange({ year: 2026, month: 6 })
    const july = monthRange({ year: 2026, month: 7 })
    // Jul 1 00:00 WIB = Jun 30 17:00 UTC — the half-open boundary.
    const boundary = d('2026-06-30T17:00:00Z')
    expect(isInMonth(boundary, june)).toBe(false)
    expect(isInMonth(boundary, july)).toBe(true)
  })

  it('places an early-morning WIB instant that is still prior-month UTC in the WIB month', () => {
    const july = monthRange({ year: 2026, month: 7 })
    // Jul 1 02:00 WIB = Jun 30 19:00 UTC — naive UTC grouping would mis-file this as June.
    expect(isInMonth(d('2026-06-30T19:00:00Z'), july)).toBe(true)
  })

  it('rolls December over into the next January', () => {
    const { start, end } = monthRange({ year: 2026, month: 12 })
    expect(start.toISOString()).toBe('2026-11-30T17:00:00.000Z')
    expect(end.toISOString()).toBe('2026-12-31T17:00:00.000Z')
  })

  it('previousMonth wraps January back to the prior December', () => {
    expect(previousMonth({ year: 2026, month: 1 })).toEqual({ year: 2025, month: 12 })
    expect(previousMonth({ year: 2026, month: 7 })).toEqual({ year: 2026, month: 6 })
  })
})
