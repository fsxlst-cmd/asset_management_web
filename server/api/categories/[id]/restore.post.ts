import { defineEventHandler, getRouterParam } from 'h3'
import { useContainer } from '@infra/container'

/** Un-archive a category, returning it to the active list and the pickers. */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  await callUseCase(() => useContainer().restoreCategory.execute(id))
  return { ok: true }
})
