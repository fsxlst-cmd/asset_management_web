## Context

The app uses a hexagonal architecture: pure domain entities and services (`server/core/domain`), use-cases and a read-side assembly (`server/core/application/read-model.ts`), ports with Drizzle + in-memory adapters, Nitro API routes, and a Nuxt UI. All account/envelope balances are **derived on read** (no materialised aggregates), and validation is enforced at every route boundary via shared zod schemas (`shared/schemas.ts`).

The ledger already carries everything this report needs: `ledgerEntries` are typed `expense | income | transfer`, store `amount` (integer rupiah), `date` (epoch ms), and — since `add-income-expense-categories` — a `categoryId` on every income and expense. `ReadModel` already has a `categoryNames(kind)` helper that resolves ids to names **including archived categories**, so old rows still render. Budget accrual already defines a WIB (Asia/Jakarta, UTC+7, no-DST) day boundary via `BASE_TZ_OFFSET_MS` in `server/core/domain/services/accrual.ts`.

This change is purely additive and read-only: it aggregates existing expense rows for a month, by category, with a prior-month comparison.

## Goals / Non-Goals

**Goals:**
- One chosen calendar month → expenses aggregated by category, ranked by spend descending.
- Each row: total, share-of-month-total %, and a delta vs the same category last month.
- WIB month boundaries, consistent with budget accrual's day boundary.
- A robust delta that avoids meaningless huge percentages on tiny prior-month bases, and a "NEW" marker for first-appearance categories.
- A "quiet this month" list: categories that had spend last month but none this month.
- Expenses only; income and transfers excluded.

**Non-Goals:**
- Income breakdown reporting (a possible later sibling capability).
- Multi-month trend charts / sparklines — single month with a one-step prior-month comparison only.
- Comparing actuals against budget envelopes in this report — categories and envelopes stay separate lenses (deliberately, per earlier exploration).
- Drill-down from a category into its transactions (the account/budget detail pages already list transactions).
- Export (CSV/PDF), custom date ranges, rolling windows.

## Decisions

### Decision 1: A read-only `ReadModel.getSpendingReport(month)`, no new persistence
The report is an aggregation over rows that already exist, so it follows the existing "derive on read" pattern (design Decision 5 of cash-asset-tracking) rather than introducing a stored summary table. The method lives in `read-model.ts` alongside `getBudgetDetail`, takes a `{ year, month }` (or `YYYY-MM`), calls `repos.ledger.list()` once, filters to expenses in the WIB month range, groups by `categoryId`, and does the same for the prior month to compute deltas.
- *Alternative considered*: a materialised monthly-totals table updated on each write. Rejected — premature optimisation for a single-user local app, and it would add a write-path coupling and a migration for data we can aggregate in microseconds on read.

### Decision 2: WIB month range reuses the accrual boundary, not a fresh tz computation
A monthly report **must** use the same local-midnight rule as budget accrual, or a late-night-June-30 expense would land in July. `accrual.ts` already encodes WIB via `BASE_TZ_OFFSET_MS` and a `localParts` shift. This change extracts/exposes a small `monthRange(year, month): { start: Date, end: Date }` helper that returns `[first-of-month 00:00 WIB, first-of-next-month 00:00 WIB)` using the same offset, so both features share one definition.
- The range is **half-open** `[start, end)`: an expense exactly at next-month 00:00 WIB belongs to the next month.
- `localParts` is currently private to `accrual.ts`; this change promotes the month-boundary computation to a shared, tested helper (either exported from `accrual.ts` or a new `month-range.ts` beside it) so the domain keeps one source of truth for WIB calendar math.

### Decision 3: Delta is percentage by default, absolute when the prior base is tiny
For each category with spend this month, compare to its prior-month total:
- prior `> threshold` → percentage change `(this − prior) / prior`, rounded.
- prior `> 0` but `≤ threshold` → **absolute** delta (`+195k`), because a percentage off a near-zero base is noise. Threshold is a single named constant (proposed **Rp 50,000**), documented in one place.
- prior `== 0` (category absent last month) → **NEW** marker; never emit `▲∞` or a percentage.
The DTO carries the raw numbers (`thisMonth`, `lastMonth`, `deltaAbsolute`) plus a discriminated `deltaKind: 'percent' | 'absolute' | 'new'` and the computed `deltaPercent?`, so the UI renders without re-deciding the rule.

### Decision 4: "Quiet this month" = had spend last month, none this
Categories appearing in the prior month's grouping but **not** in this month's are collected into a separate `quiet` list (id, name, lastMonth amount). They are kept out of the ranked rows (which are strictly this-month spend) so the main list stays "where my money went this month," while the quiet line still surfaces a stopped/forgotten category. This list is informational and unranked (or ranked by last-month amount).

### Decision 5: Tolerate uncategorised expenses defensively
The categories spec makes `categoryId` required and the migration backfilled existing rows, so in practice every expense has a category. The aggregator nonetheless groups a missing/unresolved `categoryId` under a synthetic **"Uncategorised"** bucket rather than dropping or crashing, protecting against legacy/seed/imported rows. This bucket is never written to the DB — it exists only in the report output.

### Decision 6: Bottom-nav placement — "Insights" via the existing "More" slot
The nav (`app/components/BottomNav.vue`) already has five items: Home, Accounts, ⊕ Add (center), Budgets, and **More → /reconcile**. Five is the comfortable maximum for a mobile bottom bar. Rather than crowd a sixth icon in, the **"More" entry becomes a hub** that links to Insights, Reconcile, and Categories (today "More" goes straight to `/reconcile`). The report itself lives at `app/pages/insights.vue`. This keeps the primary bar uncluttered while making the report a first-class, returned-to destination.
- *Alternative considered*: replace Budgets or Reconcile in the primary bar with Insights. Rejected — both are existing primary tasks; demoting them to add a report is the wrong trade.
- *Alternative considered*: embed the breakdown on the dashboard. Rejected — the user explicitly chose a dedicated tab, and the dashboard is already a summary surface.

## Risks / Open Questions

- **"More" → hub is a small nav refactor.** Today "More" deep-links to `/reconcile`; turning it into a menu touches `BottomNav.vue` and adds a hub page or menu. If that feels heavier than wanted, a stop-gap is to route "More" to Insights and reach Reconcile/Categories from within it. Flagged for the implementer.
- **Threshold value (Rp 50,000)** for the tiny-base rule is a first guess; trivially tunable in one constant once the user sees real data.
- **Month picker bounds.** The picker should not let the user page to months with no data forever; a sensible default is to clamp to the range between the first ledger entry's month and the current month. Minor UX detail, not a spec invariant.
