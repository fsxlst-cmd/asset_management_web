import { defineEventHandler } from 'h3'
import { createEnvelopeSchema } from '@shared/schemas'
import { useContainer } from '@infra/container'

export default defineEventHandler(async (event) => {
  const body = await useValidatedBody(event, createEnvelopeSchema)
  return callUseCase(() => useContainer().createEnvelope.execute(body))
})
