import { defineEventHandler, getQuery, createError } from 'h3'
import { crossCheckQuerySchema } from '@shared/schemas'
import { useContainer } from '@infra/container'

export default defineEventHandler(async (event) => {
  const parsed = crossCheckQuerySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid period', data: parsed.error.flatten() })
  }
  return useContainer().runCrossCheck.execute({
    periodStart: new Date(parsed.data.periodStart),
    periodEnd: new Date(parsed.data.periodEnd),
  })
})
