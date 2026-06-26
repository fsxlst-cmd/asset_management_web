import { defineEventHandler, getRouterParam } from 'h3'
import { editAccrualSchema } from '@shared/schemas'
import { useContainer } from '@infra/container'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const body = await useValidatedBody(event, editAccrualSchema)
  return callUseCase(() =>
    useContainer().editAccrual.execute({ envelopeId: id, amount: body.amount, period: body.period }),
  )
})
