import { defineEventHandler } from 'h3'
import { logIncomeSchema } from '@shared/schemas'
import { useContainer } from '@infra/container'

export default defineEventHandler(async (event) => {
  const body = await useValidatedBody(event, logIncomeSchema)
  return callUseCase(() =>
    useContainer().logIncome.execute({
      amount: body.amount,
      destinationAccountId: body.destinationAccountId,
      date: body.date ? new Date(body.date) : undefined,
      note: body.note,
    }),
  )
})
