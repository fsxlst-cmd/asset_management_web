## Context

The app uses a hexagonal architecture: pure domain entities (`server/core/domain`), use-cases (`server/core/application`), ports (`server/core/ports`) with Drizzle + in-memory adapters, Nitro API routes, and a Nuxt UI whose only transaction-entry surface is `app/pages/add.vue` (a mode toggle over expense/income/transfer). Validation is enforced at every route boundary via shared zod schemas (`shared/schemas.ts`). Persistence is SQLite via better-sqlite3 + Drizzle, with a `SqliteUnitOfWork` wrapping each write in `BEGIN IMMEDIATE`/`COMMIT`.

Expenses already carry a required budget `envelopeId`; income carries nothing classifying it. This change adds an independent `categoryId` to both income and expense, plus a user-managed Category list per kind. Notably, the expense form **already labels the envelope picker "BUDGET CATEGORY"** — introducing a real category alongside it risks confusing the two, so naming in the UI matters.

## Goals / Non-Goals

**Goals:**
- A `Category` entity scoped by kind (`income` | `expense`), with two strictly separate lists.
- CRUD: create, rename, list-by-kind, archive (soft-delete), restore.
- `categoryId` required on every new income and expense; validated to match kind and be active.
- Archived categories vanish from pickers but stay readable on old records.
- Safe migration: a system `"Other"` category per kind, with all existing rows backfilled, so "required" never invalidates history or locks the user out.
- Fast entry: amount → tap a category chip → save, with the budget envelope defaulting smartly.

**Non-Goals:**
- Spending/income **breakdown by category** reporting (deferred fast-follow).
- Categories on transfers (transfers stay uncategorised, like budgets).
- Budgets/targets/accruals on categories — categories are plain labels.
- Nested/hierarchical categories, colors, or icons.
- Backfilling an opinionated default category list beyond `"Other"`.

## Decisions

### Decision 1: Category is a first-class entity and its own capability, not an extension of Envelope
Categories and envelopes are deliberately **two dimensions** (the user's explicit choice). Envelopes carry accrual/balance semantics; categories are plain labels split by kind. Modeling Category separately keeps `budget-envelopes` untouched and gives income its own list.
- **Entity**: `Category { id: string; name: string; kind: 'income' | 'expense'; archivedAt?: Date }` in `server/core/domain/entities.ts`.
- **Entries**: add `readonly categoryId: string` to both `ExpenseEntry` and `IncomeEntry`. `TransferEntry` is unchanged.
- *Alternative considered*: reuse plain (non-accruing) envelopes as expense categories. Rejected — it conflates budget and label, and gives income no home.

### Decision 2: Soft-delete via a nullable `archivedAt` timestamp, not a boolean
`archivedAt?: Date` records *when* it was archived (useful later) and doubles as the active/inactive flag (`archivedAt == null` ⇒ active). Archive sets it to `clock.now()`; restore clears it to null. List-by-kind takes an `includeArchived` flag (default false) so pickers get only active ones and the management screen's "show archived" toggle gets all.
- *Alternative*: hard delete with FK `ON DELETE RESTRICT` (the envelope pattern). Rejected — the user chose archive specifically to preserve history; restore would be impossible.

### Decision 3: Validation lives in the use-case, inside the transaction
`LogExpense`/`LogIncome` already run inside `uow.transaction`. They will fetch the category by id and reject (`NotFoundError`/`ValidationError`) when: it does not exist, `archivedAt != null`, or `kind` mismatches the entry type. This mirrors the existing envelope/account existence checks and keeps the rule in one place. The zod schema only enforces `categoryId` is a non-empty string; semantic checks (kind, archived) need DB access and stay in the use-case.

### Decision 4: Migration creates two fixed `"Other"` categories and backfills, columns added NOT NULL
A new Drizzle migration:
1. creates the `categories` table;
2. inserts two rows with **stable, well-known ids** (e.g. `cat_other_income`, `cat_other_expense`) named `"Other"`, kind set accordingly, `archivedAt` null;
3. adds `category_id` to the ledger table and backfills every existing income row → `cat_other_income`, every expense row → `cat_other_expense` (transfers stay null).

Adding a NOT NULL column to existing rows in SQLite requires either a default during the add or a create-copy-swap; the backfill UPDATE happens before the NOT NULL constraint is relied upon. The well-known ids let the backfill and any future logic reference `"Other"` without a lookup. `"Other"` categories are ordinary rows — the user can rename or archive them, but they are never auto-deleted.
- *Alternative*: make `categoryId` nullable and treat null as "Uncategorized". Rejected — the user chose *required*; a real `"Other"` row keeps the column non-null and the picker honest.

### Decision 5: `CategoryRepository` port + two adapters; ledger carries the new field
New port `CategoryRepository { create, getById, list(kind, {includeArchived}), update (name + archivedAt) }` added to `repositories.ts`, implemented in `drizzle-repositories` and the in-memory test double. The ledger `add` and row mappers gain `categoryId`. Read paths join category name onto income/expense transaction DTOs (`TransactionDto` gains `categoryId` + `categoryName`), filled the same way `envelopeName` is today via an id→name map.

### Decision 6: UI — rename the envelope picker, add a category chip row, default the envelope
To kill the "BUDGET CATEGORY" collision, the existing envelope picker in `add.vue` is relabeled **"BUDGET"** (or "BUDGET ENVELOPE"); the new control is labeled **"CATEGORY"**. Category is rendered as a horizontal **chip row** (quick tap) for fast entry, shown for both expense and income modes using the kind-appropriate list. The budget envelope keeps its smart default (first/last-used) so expense entry stays one deliberate tap (category) plus a pre-filled budget. Category management gets its own screen(s) reachable from the budget/settings area, with a per-kind list, create/rename, archive, a "show archived" toggle, and restore.

## Risks / Trade-offs

- **Two pickers on every expense add friction** → Mitigation: category as a one-tap chip row, budget envelope pre-defaulted; the user only *must* touch the category.
- **Fresh DB has no user categories, only "Other"** → Mitigation: "Other" exists from migration so logging always works; the empty-list management screen invites creating real ones. (No lock-out.)
- **SQLite NOT NULL column add on a populated table is fiddly** → Mitigation: ordered migration (create table + Other rows → add column → backfill) and a migration test asserting every pre-existing row ends up tagged.
- **UI label collision ("BUDGET CATEGORY" vs new "CATEGORY")** → Mitigation: relabel the envelope picker as part of this change (Decision 6).
- **Archived category still referenced by old rows** → Mitigation: reads resolve names by id map regardless of archived state, so history renders; only pickers filter on `archivedAt == null`.
