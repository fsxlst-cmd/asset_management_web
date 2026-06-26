import { Money } from '../money'
import type { AccrualRule, AccrualPeriod } from '../entities'

/**
 * Lazy accrual (design.md Decision 5): the accrued total is computed on read as
 * `rate × periods elapsed since the anchor`, never materialised as daily rows.
 * Changing the rate therefore only affects future reads (budget-envelopes spec:
 * "future accruals use the new rate; past accruals are unchanged" — because there
 * are no stored past accruals to rewrite).
 *
 * The anchor period counts as the first accrual: on the anchor day the envelope has
 * already accrued one period. This matches the spec carryover example — after two
 * days the available balance reflects two daily accruals.
 */

const MS_PER_DAY = 86_400_000

/**
 * Day boundaries are computed in the app's base timezone — WIB (Asia/Jakarta,
 * UTC+7, no DST) — so a daily budget rolls over at local midnight, matching the
 * user's sense of "a new day", not 00:00 UTC. WIB has no daylight-saving, so a
 * fixed offset is exact and keeps the domain pure (no Intl/tz database needed).
 */
export const BASE_TZ_OFFSET_MS = 7 * 60 * 60 * 1000

/** Index of the WIB calendar day containing `d` (days since the WIB epoch). */
function localDayIndex(d: Date): number {
  return Math.floor((d.getTime() + BASE_TZ_OFFSET_MS) / MS_PER_DAY)
}

/** WIB calendar parts of `d`, for month arithmetic. */
function localParts(d: Date): { year: number; month: number; day: number } {
  const shifted = new Date(d.getTime() + BASE_TZ_OFFSET_MS)
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth(), day: shifted.getUTCDate() }
}

export function periodsElapsed(period: AccrualPeriod, anchor: Date, asOf: Date): number {
  const startDay = localDayIndex(anchor)
  const nowDay = localDayIndex(asOf)
  if (nowDay < startDay) return 0

  switch (period) {
    case 'day':
      return nowDay - startDay + 1
    case 'week':
      return Math.floor((nowDay - startDay) / 7) + 1
    case 'month': {
      const a = localParts(anchor)
      const b = localParts(asOf)
      const months = (b.year - a.year) * 12 + (b.month - a.month)
      // If we haven't reached the anchor day-of-month yet this month, that period
      // hasn't completed its start — but the anchor month itself still counts as 1.
      const dayShortfall = b.day < a.day ? 1 : 0
      return Math.max(0, months - dayShortfall) + 1
    }
  }
}

/**
 * Total amount accrued into an envelope through `asOf`: the frozen baseline (accruals
 * at prior rates, before the current anchor) plus the current rate × periods elapsed.
 */
export function accruedSoFar(rule: AccrualRule, asOf: Date): Money {
  const baseline = rule.baseline ?? Money.ZERO
  return baseline.plus(rule.amount.times(periodsElapsed(rule.period, rule.anchor, asOf)))
}
