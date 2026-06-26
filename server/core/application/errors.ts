/**
 * Domain/application errors. The transport layer maps these to HTTP status codes
 * (server/api), keeping the use-cases free of any HTTP knowledge.
 */
export class ValidationError extends Error {
  readonly code = 'VALIDATION_ERROR'
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

export class NotFoundError extends Error {
  readonly code = 'NOT_FOUND'
  constructor(message: string) {
    super(message)
    this.name = 'NotFoundError'
  }
}
