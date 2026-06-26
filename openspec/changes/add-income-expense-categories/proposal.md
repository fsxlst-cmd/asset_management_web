## Why

Income and expense entries currently have no classification of their own. Expenses are assigned to a budget envelope (intent to spend), but that is a budgeting bucket, not a reporting label — and income has no classification at all. The user wants to tag every record with a category so income and spending can be understood by kind (Salary vs Freelance, Dining vs Subscriptions), independently of how a budget is organised.

## What Changes

- Introduce a **Category** concept: `{ id, name, kind: 'income' | 'expense', archivedAt? }`. Income categories and expense categories are two separate lists that are never mixed.
- Full CRUD on categories: create, rename, list-by-kind, **archive** (soft-delete), and **restore** (un-archive). Archiving hides a category from pickers but keeps it readable on existing records; restoring brings it back.
- **Category becomes required** on every new income and every new expense. **BREAKING** for the write path: the income and expense routes now reject entries without a valid `categoryId`.
- Category is a **second, independent dimension** on expenses: an expense keeps its existing budget `envelopeId` **and** gains a `categoryId`. Income gains a `categoryId`. Categories are plain labels — they carry no budget, target, or accrual.
- Validation: a chosen category MUST match the entry's kind (income category on income, expense category on expense) and MUST NOT be archived.
- **Migration**: create two system `"Other"` categories (one income, one expense) and assign every pre-existing income/expense row to the matching one, so making the field required does not invalidate history. No opinionated default category list is shipped beyond `"Other"`.
- UX: two category-management screens (with a *Show archived* toggle and a *Restore* action), and quick-pick category chips in the income/expense entry forms so logging is *amount → tap a category → save*, with the budget envelope defaulting smartly so it is not a second heavy tap.

Out of scope (deferred fast-follow): a spending/income **breakdown by category** report. This change makes the data categorisable; reporting on it comes later.

## Capabilities

### New Capabilities
- `transaction-categories`: user-managed income and expense category lists — creation, rename, archive (soft-delete), restore, listing scoped by kind, and the kind/archived validation rules that govern which category a record may use.

### Modified Capabilities
- `cash-transactions`: expense and income entries now require a category. Logging an expense or income MUST assign exactly one category of the matching kind, in addition to the expense's existing budget envelope.

## Impact

- **Domain**: new `Category` entity; `categoryId` added to `ExpenseEntry` and `IncomeEntry` in `server/core/domain/entities.ts`.
- **Persistence**: new `categories` table and `categoryId` columns on the ledger in `server/infrastructure/db/schema.ts`; a migration that creates the `"Other"` categories and backfills existing rows; mappers updated.
- **Ports/repositories**: new `CategoryRepository` port + Drizzle/in-memory implementations; `ledger.add` carries the new field.
- **Application**: new use-cases `CreateCategory`, `RenameCategory`, `ArchiveCategory`, `RestoreCategory`, `ListCategories(kind)`; `LogIncome`/`LogExpense` updated to require and validate `categoryId`; container wiring.
- **API**: new `/api/categories` CRUD routes; `transactions/income.post` and `transactions/expense.post` accept and validate `categoryId`.
- **Validation**: new zod schemas + `categoryId` added to `logIncomeSchema`/`logExpenseSchema` in `shared/schemas.ts`.
- **Read model / DTO**: category exposed on transaction rows in the read-model and `shared/dto.ts`.
- **UI**: two category-management screens; quick-pick chips in the income/expense forms; `app/composables/useApi.ts` extended.
- **Tests**: use-case, validation, migration/backfill, and read-model coverage.
