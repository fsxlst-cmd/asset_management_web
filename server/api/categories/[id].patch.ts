import { defineEventHandler, getRouterParam } from 'h3'
import { renameCategorySchema } from '@shared/schemas'
import { useContainer } from '@infra/container'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const body = await useValidatedBody(event, renameCategorySchema)
  await callUseCase(() => useContainer().renameCategory.execute(id, body.name))
  return { ok: true }
})
