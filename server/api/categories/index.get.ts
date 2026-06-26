import { defineEventHandler, getQuery, createError } from 'h3'
import { listCategoriesQuerySchema } from '@shared/schemas'
import type { CategoryDto } from '@shared/dto'
import { useContainer } from '@infra/container'

export default defineEventHandler(async (event): Promise<CategoryDto[]> => {
  const parsed = listCategoriesQuerySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid category query', data: parsed.error.flatten() })
  }
  const categories = await useContainer().listCategories.execute(parsed.data.kind, {
    includeArchived: parsed.data.includeArchived,
  })
  return categories.map((c) => ({ id: c.id, name: c.name, kind: c.kind, archived: !!c.archivedAt }))
})
