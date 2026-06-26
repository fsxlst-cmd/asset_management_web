import type Database from 'better-sqlite3'
import type { Db } from '../db/client'
import type { UnitOfWork } from '@core/ports/unit-of-work'
import type { Repositories } from '@core/ports/repositories'
import { createRepositories } from './drizzle-repositories'

/**
 * SQLite-backed UnitOfWork (design.md Decision 4). Runs the work between
 * BEGIN/COMMIT and rolls back on any error, so a transfer or reconciliation can
 * never half-apply.
 *
 * better-sqlite3 is synchronous and the repositories do no real async I/O, but
 * the port's work() is async; rather than rely on that, transactions are serialised
 * through a one-at-a-time queue so two never interleave on the shared connection.
 */
export class SqliteUnitOfWork implements UnitOfWork {
  private readonly repos: Repositories
  private queue: Promise<unknown> = Promise.resolve()

  constructor(
    private readonly db: Db,
    private readonly sqlite: Database.Database,
  ) {
    this.repos = createRepositories(db)
  }

  transaction<T>(work: (repos: Repositories) => Promise<T>): Promise<T> {
    // Chain onto the queue so only one transaction is in flight at a time.
    const run = this.queue.then(() => this.runExclusive(work))
    // Keep the queue alive even if this transaction rejects.
    this.queue = run.catch(() => undefined)
    return run
  }

  private async runExclusive<T>(work: (repos: Repositories) => Promise<T>): Promise<T> {
    this.sqlite.exec('BEGIN IMMEDIATE')
    try {
      const result = await work(this.repos)
      this.sqlite.exec('COMMIT')
      return result
    } catch (err) {
      this.sqlite.exec('ROLLBACK')
      throw err
    }
  }
}
