import { getDb, getSqlite } from './db/client'
import { createRepositories } from './repositories/drizzle-repositories'
import { SqliteUnitOfWork } from './repositories/unit-of-work'
import { systemClock, uuidIds } from './adapters'
import {
  CreateAccount,
  LogExpense,
  LogIncome,
  RecordTransfer,
  TakeSnapshot,
  SubmitReconciliation,
} from '@core/application/write-use-cases'
import { EditAccrual } from '@core/application/edit-accrual'
import { CreateEnvelope, DeleteEnvelope } from '@core/application/envelope-use-cases'
import { ReadModel } from '@core/application/read-model'
import { RunCrossCheck } from '@core/application/run-cross-check'

/**
 * Composition root — the one place that wires concrete adapters (SQLite repos, the
 * UnitOfWork, the system clock, UUID ids) into the framework-agnostic use-cases.
 * Nitro routes import only this; they never touch infrastructure or the domain directly.
 */
function build() {
  const db = getDb()
  const repos = createRepositories(db)
  const uow = new SqliteUnitOfWork(db, getSqlite())
  const deps = { uow, clock: systemClock, ids: uuidIds }

  return {
    createAccount: new CreateAccount(deps),
    logExpense: new LogExpense(deps),
    logIncome: new LogIncome(deps),
    recordTransfer: new RecordTransfer(deps),
    takeSnapshot: new TakeSnapshot(deps),
    submitReconciliation: new SubmitReconciliation(deps),
    editAccrual: new EditAccrual({ uow, clock: systemClock }),
    createEnvelope: new CreateEnvelope(deps),
    deleteEnvelope: new DeleteEnvelope({ uow }),
    read: new ReadModel(repos, systemClock),
    runCrossCheck: new RunCrossCheck(repos),
  }
}

let instance: ReturnType<typeof build> | undefined

/** Lazily-built singleton container, shared across Nitro requests. */
export function useContainer() {
  if (!instance) instance = build()
  return instance
}
