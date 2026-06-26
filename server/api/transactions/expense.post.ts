import { defineEventHandler } from 'h3'
import { logExpenseSchema } from '@shared/schemas'
import { useContainer } from '@infra/container'

export default defineEventHandler(async (event) => {
  const body = await useValidatedBody(event, logExpenseSchema)
  return callUseCase(() =>
    useContainer().logExpense.execute({
      amount: body.amount,
      envelopeId: body.envelopeId,
      sourceAccountId: body.sourceAccountId,
      date: body.date ? new Date(body.date) : undefined,
      note: body.note,
    }),
  )
})
