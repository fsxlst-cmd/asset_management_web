## 1. Domain

- [x] 1.1 Add `Category { id, name, kind: 'income' | 'expense', archivedAt? }` to `server/core/domain/entities.ts`
- [x] 1.2 Add `readonly categoryId: string` to `ExpenseEntry` and `IncomeEntry` (leave `TransferEntry` unchanged)

## 2. Ports & repositories

- [x] 2.1 Add `CategoryRepository` port to `server/core/ports/repositories.ts` (`create`, `getById`, `list(kind, { includeArchived })`, `update` for name + `archivedAt`)
- [x] 2.2 Implement `CategoryRepository` in the Drizzle adapter (`drizzle-repositories`); wire it into `Repositories`
- [x] 2.3 Implement `CategoryRepository` in the in-memory test double (`server/core/testing/in-memory.ts`)
- [x] 2.4 Extend `ledger.add` and the row mappers to persist/read `categoryId`

## 3. Persistence & migration

- [x] 3.1 Add the `categories` table and a `category_id` column on the ledger in `server/infrastructure/db/schema.ts`; update `mappers.ts`
- [x] 3.2 Write a migration that: creates `categories`, inserts the two well-known `"Other"` rows (`cat_other_income`, `cat_other_expense`), adds `category_id` to the ledger, and backfills existing income→Other-income / expense→Other-expense
- [x] 3.3 Test the migration/backfill: every pre-existing income and expense row ends up with the matching `"Other"` category and no transfer is tagged

## 4. Application use-cases

- [x] 4.1 Add `CreateCategory` (validates non-empty name + kind) and `RenameCategory`
- [x] 4.2 Add `ArchiveCategory` (sets `archivedAt = clock.now()`) and `RestoreCategory` (clears `archivedAt`)
- [x] 4.3 Add `ListCategories(kind, { includeArchived })`
- [x] 4.4 Update `LogExpense` to require `categoryId` and reject when the category is missing, archived, or not expense-kind (inside the existing transaction)
- [x] 4.5 Update `LogIncome` to require `categoryId` and reject when the category is missing, archived, or not income-kind
- [x] 4.6 Wire the new use-cases and repository into `server/infrastructure/container.ts`
- [x] 4.7 Unit-test the use-cases: create/rename/archive/restore, list excludes archived by default, and kind/archived rejection on log paths

## 5. Validation schemas

- [x] 5.1 Add category zod schemas to `shared/schemas.ts` (create/rename with name bounds + `kind` enum)
- [x] 5.2 Add required `categoryId: z.string().min(1)` to `logExpenseSchema` and `logIncomeSchema`; export new body types

## 6. API routes

- [x] 6.1 Add `/api/categories` routes: list-by-kind (GET with `?kind=&includeArchived=`), create (POST), rename (PATCH `[id]`), archive (DELETE `[id]`), restore (POST `[id]/restore`)
- [x] 6.2 Update `transactions/expense.post.ts` and `transactions/income.post.ts` to accept and pass `categoryId`

## 7. Read model & DTOs

- [x] 7.1 Add `categoryId` + `categoryName` to the income/expense `TransactionDto` in `shared/dto.ts`; add a `CategoryDto`
- [x] 7.2 Resolve category name onto transaction rows in `read-model.ts` (id→name map, same pattern as `envelopeName`), tolerating archived categories
- [x] 7.3 Extend `app/composables/useApi.ts` with category list/create/rename/archive/restore and the new transaction body fields

## 8. UI

- [x] 8.1 In `app/pages/add.vue`, relabel the budget envelope picker from "BUDGET CATEGORY" to "BUDGET" to remove the collision
- [x] 8.2 Add a required CATEGORY chip-row to the expense and income modes, loading the kind-appropriate active categories; keep the budget envelope smart-default so expense entry stays one category tap
- [x] 8.3 Gate save on a chosen category (extend `canSave`) and surface validation errors
- [x] 8.4 Add category-management screen(s): per-kind list, create, rename, archive, "show archived" toggle, and restore
- [x] 8.5 Show the category name on transaction rows where envelope/account are shown today (`TransactionRow` and detail pages)

## 9. Verification

- [x] 9.1 Run the full test suite and `eslint`; confirm logging income/expense without a category is rejected end-to-end and that existing data shows "Other"
