import { createError, readBody, type H3Event } from 'h3'
import type { ZodSchema } from 'zod'
import { NotFoundError, ValidationError } from '@core/application/errors'

/**
 * Transport helpers. Routes stay thin (design.md Decision 2): they validate input
 * with a shared zod schema, call a use-case, and map domain errors to HTTP — no
 * business logic here.
 */

/** Parse and validate the request body, throwing a 400 on failure. */
export async function useValidatedBody<T>(event: H3Event, schema: ZodSchema<T>): Promise<T> {
  const body = await readBody(event).catch(() => undefined)
  const result = schema.safeParse(body)
  if (!result.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid request', data: result.error.flatten() })
  }
  return result.data
}

/** Run a use-case, translating domain errors into HTTP status codes. */
export async function callUseCase<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    if (err instanceof ValidationError) {
      throw createError({ statusCode: 400, statusMessage: err.message })
    }
    if (err instanceof NotFoundError) {
      throw createError({ statusCode: 404, statusMessage: err.message })
    }
    throw err
  }
}
