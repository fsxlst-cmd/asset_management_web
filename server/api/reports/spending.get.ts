import { defineEventHandler, getQuery, createError } from 'h3'
import { spendingReportQuerySchema } from '@shared/schemas'
import type { SpendingReportDto } from '@shared/dto'
import { useContainer } from '@infra/container'
import { systemClock } from '@infra/adapters'
import { localParts } from '@core/domain/services/accrual'

/** Current WIB calendar month as `{ year, month }` (month 1–12). */
function currentWibMonth(): { year: number; month: number } {
  const parts = localParts(systemClock.now())
  return { year: parts.year, month: parts.month + 1 } // localParts.month is 0-based
}

/**
 * GET /api/reports/spending?month=YYYY-MM — category-ranked spending for one WIB month.
 * When `month` is absent, default to the current WIB calendar month.
 */
export default defineEventHandler(async (event): Promise<SpendingReportDto> => {
  const parsed = spendingReportQuerySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid month', data: parsed.error.flatten() })
  }
  const ym = parsed.data.month ?? currentWibMonth()
  return callUseCase(() => useContainer().read.getSpendingReport(ym))
})
