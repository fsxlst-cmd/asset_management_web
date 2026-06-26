import type { Category, CategoryKind } from '../domain/entities'
import type { UnitOfWork } from '../ports/unit-of-work'
import type { Clock } from '../ports/clock'
import type { IdGenerator } from '../ports/id-generator'
import type { CategoryListOptions, Repositories } from '../ports/repositories'
import { NotFoundError, ValidationError } from './errors'

interface Deps {
  readonly uow: UnitOfWork
  readonly clock: Clock
  readonly ids: IdGenerator
}

const MAX_NAME = 80

function cleanName(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) throw new ValidationError('Category name is required')
  if (trimmed.length > MAX_NAME) throw new ValidationError(`Category name must be ${MAX_NAME} characters or fewer`)
  return trimmed
}

export interface CreateCategoryInput {
  name: string
  kind: CategoryKind
}

/** Create an income or expense category (transaction-categories spec — user-managed). */
export class CreateCategory {
  constructor(private readonly deps: Deps) {}

  async execute(input: CreateCategoryInput): Promise<{ id: string }> {
    const name = cleanName(input.name)
    return this.deps.uow.transaction(async (repos) => {
      const category: Category = { id: this.deps.ids.next(), name, kind: input.kind }
      await repos.categories.create(category)
      return { id: category.id }
    })
  }
}

/** Rename a category. Kind and archived state are unchanged; old records keep pointing at it. */
export class RenameCategory {
  constructor(private readonly deps: { uow: UnitOfWork }) {}

  async execute(id: string, name: string): Promise<void> {
    const clean = cleanName(name)
    await this.deps.uow.transaction(async (repos) => {
      const category = await repos.categories.getById(id)
      if (!category) throw new NotFoundError(`Category ${id} not found`)
      await repos.categories.rename(id, clean)
    })
  }
}

/**
 * Archive (soft-delete) a category. It vanishes from pickers but stays readable on
 * records already tagged with it; no record is rewritten. Reversible via RestoreCategory.
 */
export class ArchiveCategory {
  constructor(private readonly deps: { uow: UnitOfWork; clock: Clock }) {}

  async execute(id: string): Promise<void> {
    await this.deps.uow.transaction(async (repos) => {
      const category = await repos.categories.getById(id)
      if (!category) throw new NotFoundError(`Category ${id} not found`)
      await repos.categories.setArchived(id, this.deps.clock.now())
    })
  }
}

/** Restore an archived category, returning it to the active list and the pickers. */
export class RestoreCategory {
  constructor(private readonly deps: { uow: UnitOfWork }) {}

  async execute(id: string): Promise<void> {
    await this.deps.uow.transaction(async (repos) => {
      const category = await repos.categories.getById(id)
      if (!category) throw new NotFoundError(`Category ${id} not found`)
      await repos.categories.setArchived(id, undefined)
    })
  }
}

/** List categories of one kind (active only by default). Read-only — takes repos directly. */
export class ListCategories {
  constructor(private readonly repos: Repositories) {}

  async execute(kind: CategoryKind, options?: CategoryListOptions): Promise<Category[]> {
    return this.repos.categories.list(kind, options)
  }
}
