import { defineEventHandler } from 'h3'
import { useContainer } from '@infra/container'

export default defineEventHandler(async () => {
  return useContainer().read.getDashboard()
})
