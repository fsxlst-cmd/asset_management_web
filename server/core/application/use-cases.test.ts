import { describe, it, expect, beforeEach } from 'vitest'
import { Money } from '../domain/money'
import type { Asset, Envelope } from '../domain/entities'
import { InMemoryDatabase, FakeClock, SequentialIds } from '../testing/in-memory'
import {
  CreateAccount,
  LogExpense,
  RecordTransfer,
  TakeSnapshot,
  SubmitReconciliation,
} from './write-use-cases'
import { CreateEnvelope, DeleteEnvelope } from './envelope-use-cases'
import { ReadModel } from './read-model'
import { RunCrossCheck } from './run-cross-check'

const cash: Asset = { id: 'cash', kind: 'cash', name: 'Cash', unit: 'IDR', unitValue: Money.fromRupiah(1) }

describe('use-cases (in-memory)', () => {
  let db: InMemoryDatabase
  let clock: FakeClock
  let deps: { uow: InMemoryDatabase['uow']; clock: FakeClock; ids: SequentialIds }

  beforeEach(() => {
    db = new InMemoryDatabase()
    db.store.assets.push(cash)
    // A required expense category, seeded so expense use-cases have one to tag.
    db.store.categories.push({ id: 'food', name: 'Food', kind: 'expense' })
    clock = new FakeClock(new Date('2026-06-20T10:00:00Z'))
    deps = { uow: db.uow, clock, ids: new SequentialIds() }
  })

  async function makeAccount(name: string, kind: 'bank' | 'cash' | 'e-wallet', initial = 0) {
    return new CreateAccount(deps).execute({ name, kind, initialBalance: initial })
  }

  it('CreateAccount stores an account with a cash holding and opening snapshot', async () => {
    const { accountId, holdingId } = await makeAccount('BCA Utama', 'bank', 5_000_000)
    expect(db.store.accounts).toHaveLength(1)
    expect(db.store.holdings[0]!.quantity.toInt()).toBe(5_000_000)
    expect(db.store.snapshots[0]!.holdingId).toBe(holdingId)
    expect(accountId).toBeTruthy()
  })

  it('LogExpense requires an existing budget and rejects non-positive amounts', async () => {
    await expect(new LogExpense(deps).execute({ amount: 0, envelopeId: 'daily', categoryId: 'food' })).rejects.toThrow(/positive/)
    await expect(new LogExpense(deps).execute({ amount: 1000, envelopeId: 'missing', categoryId: 'food' })).rejects.toThrow(/not found/)
  })

  it('RecordTransfer rejects same-account and moves balance without changing net worth', async () => {
    const a = await makeAccount('BCA', 'bank', 1_000_000)
    const b = await makeAccount('GoPay', 'e-wallet', 0)

    await expect(
      new RecordTransfer(deps).execute({ amount: 100, sourceAccountId: a.accountId, destinationAccountId: a.accountId }),
    ).rejects.toThrow(/differ/)

    await new RecordTransfer(deps).execute({
      amount: 200_000,
      sourceAccountId: a.accountId,
      destinationAccountId: b.accountId,
      date: new Date('2026-06-21T10:00:00Z'),
    })

    const read = new ReadModel(db.repos, clock)
    const dash = await read.getDashboard()
    expect(dash.netWorth).toBe(1_000_000) // unchanged by the transfer
    const bca = dash.accounts.find((x) => x.id === a.accountId)!
    const gopay = dash.accounts.find((x) => x.id === b.accountId)!
    expect(bca.balance).toBe(800_000)
    expect(gopay.balance).toBe(200_000)
  })

  it('SubmitReconciliation is atomic — a bad holding rolls back the whole batch', async () => {
    const a = await makeAccount('BCA', 'bank', 1_000_000)
    const holdingId = db.store.holdings[0]!.id
    const before = db.store.snapshots.length

    await expect(
      new SubmitReconciliation(deps).execute([
        { holdingId, value: 900_000 },
        { holdingId: 'does-not-exist', value: 123 },
      ]),
    ).rejects.toThrow(/not found/)

    // Neither the quantity change nor the first snapshot should have persisted.
    expect(db.store.holdings[0]!.quantity.toInt()).toBe(1_000_000)
    expect(db.store.snapshots.length).toBe(before)
    void a
  })

  it('CreateEnvelope adds a recurring budget; DeleteEnvelope removes an unused one', async () => {
    const { id } = await new CreateEnvelope(deps).execute({ name: 'Daily Spending', accrual: { amount: 100_000, period: 'day' } })
    expect(db.store.envelopes).toHaveLength(1)
    expect(db.store.envelopes[0]!.accrual?.amount.toInt()).toBe(100_000)

    await new DeleteEnvelope({ uow: db.uow }).execute(id)
    expect(db.store.envelopes).toHaveLength(0)
  })

  it('DeleteEnvelope refuses when expenses are charged to the budget', async () => {
    const { id } = await new CreateEnvelope(deps).execute({ name: 'Daily', accrual: { amount: 100_000, period: 'day' } })
    await new LogExpense(deps).execute({ amount: 50_000, envelopeId: id, categoryId: 'food' })

    await expect(new DeleteEnvelope({ uow: db.uow }).execute(id)).rejects.toThrow(/charged/)
    expect(db.store.envelopes).toHaveLength(1) // still there
  })

  it('TakeSnapshot corrects drift and the cross-check surfaces untracked spending', async () => {
    await makeAccount('Cash', 'cash', 1_000_000)
    const holdingId = db.store.holdings[0]!.id

    const env: Envelope = { id: 'daily', name: 'Daily Spending', accrual: { amount: Money.fromRupiah(100_000), period: 'day', anchor: new Date('2026-06-20T00:00:00Z') } }
    db.store.envelopes.push(env)

    // Log only part of the real spending: 200k logged ...
    await new LogExpense(deps).execute({ amount: 200_000, envelopeId: 'daily', categoryId: 'food', date: new Date('2026-06-22T10:00:00Z') })

    // ... but the real balance fell by 350k. Reconcile to the real number a week later.
    clock.set(new Date('2026-06-27T10:00:00Z'))
    await new TakeSnapshot(deps).execute({ holdingId, value: 650_000 })

    const cc = await new RunCrossCheck(db.repos).execute({
      // Period runs from the opening snapshot (account creation, 10:00) to the reconcile.
      periodStart: new Date('2026-06-20T10:00:00Z'),
      periodEnd: new Date('2026-06-27T23:59:59Z'),
    })
    expect(cc.netWorthChange).toBe(-350_000)
    expect(cc.loggedExpense).toBe(200_000)
    expect(cc.untracked).toBe(150_000) // 350k real drop − 200k logged
    expect(cc.status).toBe('untracked-spending')
  })
})
