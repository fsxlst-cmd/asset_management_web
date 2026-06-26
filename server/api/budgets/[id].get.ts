import { defineEventHandler, getRouterParam } from 'h3'
import { useContainer } from '@infra/container'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  return callUseCase(() => useContainer().read.getBudgetDetail(id))
})
