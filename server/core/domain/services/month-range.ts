import { BASE_TZ_OFFSET_MS } from './accrual'

/**
 * A calendar month identified by its WIB year and 1–12 month number. Reports pick
 * a month with this shape (the `YYYY-MM` request parses into it).
 */
export interface YearMonth {
  readonly year: number
  /** 1–12 (January is 1), unlike JS Date's 0-based month. */
  readonly month: number
}

/**
 * The half-open instant range of a WIB calendar month:
 * `[first-of-month 00:00 WIB, first-of-next-month 00:00 WIB)`.
 *
 * Boundaries use the same fixed WIB offset as budget accrual (see accrual.ts), so a
 * late-night expense is counted in the month the user experienced it locally, not the
 * month it would fall in under UTC. `Date.UTC` rolls December→January over for us, so
 * `month: 12` yields an `end` in the following January.
 *
 * A WIB-midnight wall-clock time `Date.UTC(y, m, d)` corresponds to the real instant
 * `Date.UTC(y, m, d) − offset` (the inverse of accrual's `+offset` shift).
 */
export function monthRange({ year, month }: YearMonth): { start: Date; end: Date } {
  const start = new Date(Date.UTC(year, month - 1, 1) - BASE_TZ_OFFSET_MS)
  const end = new Date(Date.UTC(year, month, 1) - BASE_TZ_OFFSET_MS)
  return { start, end }
}

/** The WIB calendar month immediately before the given one (wrapping the year). */
export function previousMonth({ year, month }: YearMonth): YearMonth {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 }
}

/** True when `date` falls within the half-open WIB month range `[start, end)`. */
export function isInMonth(date: Date, range: { start: Date; end: Date }): boolean {
  const t = date.getTime()
  return t >= range.start.getTime() && t < range.end.getTime()
}
