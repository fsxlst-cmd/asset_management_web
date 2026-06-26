import { randomUUID } from 'node:crypto'
import type { Clock } from '@core/ports/clock'
import type { IdGenerator } from '@core/ports/id-generator'

export const systemClock: Clock = {
  now: () => new Date(),
}

export const uuidIds: IdGenerator = {
  next: () => randomUUID(),
}
