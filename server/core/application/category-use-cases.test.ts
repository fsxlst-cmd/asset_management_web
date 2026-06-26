import { describe, it, expect, beforeEach } from 'vitest'
import { Money } from '../domain/money'
import type { Asset } from '../domain/entities'
import { InMemoryDatabase, FakeClock, SequentialIds } from '../testing/in-memory'
import {
  CreateCategory,
  RenameCategory,
  ArchiveCategory,
  RestoreCategory,
  ListCategories,
} from './category-use-cases'
import { CreateEnvelope } from './envelope-use-cases'
import { LogExpense, LogIncome } from './write-use-cases'

const cash: Asset = { id: 'cash', kind: 'cash', name: 'Cash', unit: 'IDR', unitValue: Money.fromRupiah(1) }

describe('category use-cases (in-memory)', () => {
  let db: InMemoryDatabase
  let clock: FakeClock
  let deps: { uow: InMemoryDatabase['uow']; clock: FakeClock; ids: SequentialIds }

  beforeEach(() => {
    db = new InMemoryDatabase()
    db.store.assets.push(cash)
    clock = new FakeClock(new Date('2026-06-20T10:00:00Z'))
    deps = { uow: db.uow, clock, ids: new SequentialIds() }
  })

  it('creates income and expense categories in separate lists', async () => {
    await new CreateCategory(deps).execute({ name: 'Dining', kind: 'expense' })
    await new CreateCategory(deps).execute({ name: 'Salary', kind: 'income' })

    const list = new ListCategories(db.repos)
    const expense = await list.execute('expense')
    const income = await list.execute('income')

    expect(expense.map((c) => c.name)).toEqual(['Dining'])
    expect(income.map((c) => c.name)).toEqual(['Salary'])
  })

  it('rejects a blank name', async () => {
    await expect(new CreateCategory(deps).execute({ name: '   ', kind: 'expense' })).rejects.toThrow(/required/)
  })

  it('renames a category without changing its kind', async () => {
    const { id } = await new CreateCategory(deps).execute({ name: 'Food', kind: 'expense' })
    await new RenameCategory({ uow: db.uow }).execute(id, 'Groceries')

    const [c] = await new ListCategories(db.repos).execute('expense')
    expect(c!.name).toBe('Groceries')
    expect(c!.kind).toBe('expense')
  })

  it('archive hides from the default list but keeps it retrievable; restore brings it back', async () => {
    const { id } = await new CreateCategory(deps).execute({ name: 'Holiday', kind: 'expense' })

    await new ArchiveCategory({ uow: db.uow, clock }).execute(id)
    expect(await new ListCategories(db.repos).execute('expense')).toHaveLength(0)
    expect(await new ListCategories(db.repos).execute('expense', { includeArchived: true })).toHaveLength(1)

    await new RestoreCategory({ uow: db.uow }).execute(id)
    expect(await new ListCategories(db.repos).execute('expense')).toHaveLength(1)
  })

  it('LogExpense rejects a wrong-kind, archived, or missing category', async () => {
    const { id: envId } = await new CreateEnvelope(deps).execute({ name: 'Daily', accrual: { amount: 100_000, period: 'day' } })
    const income = await new CreateCategory(deps).execute({ name: 'Salary', kind: 'income' })
    const expense = await new CreateCategory(deps).execute({ name: 'Food', kind: 'expense' })

    // wrong kind (income category on an expense)
    await expect(
      new LogExpense(deps).execute({ amount: 1000, envelopeId: envId, categoryId: income.id }),
    ).rejects.toThrow(/not a expense category/)

    // missing category
    await expect(
      new LogExpense(deps).execute({ amount: 1000, envelopeId: envId, categoryId: 'nope' }),
    ).rejects.toThrow(/not found/)

    // archived category
    await new ArchiveCategory({ uow: db.uow, clock }).execute(expense.id)
    await expect(
      new LogExpense(deps).execute({ amount: 1000, envelopeId: envId, categoryId: expense.id }),
    ).rejects.toThrow(/archived/)

    // active matching category succeeds
    await new RestoreCategory({ uow: db.uow }).execute(expense.id)
    const ok = await new LogExpense(deps).execute({ amount: 1000, envelopeId: envId, categoryId: expense.id })
    expect(ok.id).toBeTruthy()
  })

  it('LogIncome requires an active income-kind category', async () => {
    const expense = await new CreateCategory(deps).execute({ name: 'Food', kind: 'expense' })
    await expect(
      new LogIncome(deps).execute({ amount: 5000, categoryId: expense.id }),
    ).rejects.toThrow(/not a income category/)

    const salary = await new CreateCategory(deps).execute({ name: 'Salary', kind: 'income' })
    const ok = await new LogIncome(deps).execute({ amount: 5000, categoryId: salary.id })
    expect(ok.id).toBeTruthy()
    expect(db.store.ledger[0]!.type).toBe('income')
  })
})
