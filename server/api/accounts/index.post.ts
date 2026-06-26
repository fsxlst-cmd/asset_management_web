import { defineEventHandler } from 'h3'
import { createAccountSchema } from '@shared/schemas'
import { useContainer } from '@infra/container'

export default defineEventHandler(async (event) => {
  const body = await useValidatedBody(event, createAccountSchema)
  return callUseCase(() => useContainer().createAccount.execute(body))
})
