import { defineEventHandler, getRouterParam } from 'h3'
import { useContainer } from '@infra/container'

/** Soft-delete: archives the category (hidden from pickers, kept on old records). */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  await callUseCase(() => useContainer().archiveCategory.execute(id))
  return { ok: true }
})
