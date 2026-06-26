import type { Repositories } from './repositories'

/**
 * UnitOfWork — runs a piece of work against the repositories inside a single
 * atomic transaction (design.md Decision 4). A transfer or snapshot must never
 * half-apply, so any multi-statement use-case runs through here; if the work
 * throws, the whole transaction rolls back.
 */
export interface UnitOfWork {
  transaction<T>(work: (repos: Repositories) => Promise<T>): Promise<T>
}
