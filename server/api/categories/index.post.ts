import { defineEventHandler } from 'h3'
import { createCategorySchema } from '@shared/schemas'
import { useContainer } from '@infra/container'

export default defineEventHandler(async (event) => {
  const body = await useValidatedBody(event, createCategorySchema)
  return callUseCase(() => useContainer().createCategory.execute(body))
})
