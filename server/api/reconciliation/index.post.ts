import { defineEventHandler } from 'h3'
import { reconciliationSchema } from '@shared/schemas'
import { useContainer } from '@infra/container'

export default defineEventHandler(async (event) => {
  const body = await useValidatedBody(event, reconciliationSchema)
  await callUseCase(() => useContainer().submitReconciliation.execute(body.balances))
  return { ok: true }
})
