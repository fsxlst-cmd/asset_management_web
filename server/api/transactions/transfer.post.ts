import { defineEventHandler } from 'h3'
import { recordTransferSchema } from '@shared/schemas'
import { useContainer } from '@infra/container'

export default defineEventHandler(async (event) => {
  const body = await useValidatedBody(event, recordTransferSchema)
  return callUseCase(() =>
    useContainer().recordTransfer.execute({
      amount: body.amount,
      sourceAccountId: body.sourceAccountId,
      destinationAccountId: body.destinationAccountId,
      date: body.date ? new Date(body.date) : undefined,
      note: body.note,
    }),
  )
})
