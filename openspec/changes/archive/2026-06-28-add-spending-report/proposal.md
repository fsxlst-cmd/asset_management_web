## Why

Every expense is now tagged with a category (the deferred fast-follow named in `add-income-expense-categories`), but nothing yet *reports* on those tags. The user can log spending but cannot answer the question that motivated categories in the first place: **"where does my money go in a month, and is that changing?"** A flat list of transactions is a record, not a tool — it shows *what happened* but not *what dominates* or *what is drifting*. This change turns the category data into an actionable monthly spending report so the user can see their biggest spending areas and how each one moved versus the prior month.

## What Changes

- Introduce a **Spending Report**: for one chosen calendar month, the expense ledger is aggregated **by category**, ranked biggest-spend-first, with each category's **share of the month's total** and a **delta versus the previous month**.
- **Month boundaries are WIB (Asia/Jakarta, UTC+7)** — the same local-midnight rule budget accrual already uses — so a late-night expense never leaks into the wrong month. The report covers `[month-start 00:00 WIB, next-month-start 00:00 WIB)`.
- **Expenses only.** Income and transfers are excluded — transfers move money between the user's own accounts (not spending) and income is not spending.
- **Delta vs last month**, shown as a percentage normally, but as an **absolute rupiah amount when the prior-month base is tiny** (below a small threshold), so a category that went from Rp 5,000 to Rp 200,000 reads as `+195k` rather than a meaningless `▲ 3900%`. Categories present this month but absent last month are flagged **NEW** (no `▲∞`).
- A **"quiet this month"** summary lists categories that had spending last month but none this month — sometimes a deliberate win, sometimes a forgotten recurring charge.
- **New bottom-nav surface** for the report (an "Insights" destination). Because the nav already has five slots, placement is a design decision (see design.md).
- **Read-only.** No new tables, no migration, nothing mutates. The report is a new read-model method over the existing ledger and category data.

Out of scope (see Non-Goals in design.md): income reporting, multi-month trend charts, budget/envelope comparison in this report, category drill-down, and CSV/export.

## Capabilities

### New Capabilities
- `spending-report`: a month-scoped, category-ranked view of expenses with share-of-total and prior-month comparison, computed on read over the existing ledger.

## Impact

- **Application / read model**: new `ReadModel.getSpendingReport(month)` in `server/core/application/read-model.ts`, beside `getBudgetDetail`. Reuses `repos.ledger.list()` and `categoryNames('expense')` (which already resolves archived names).
- **Domain**: a small WIB month-range helper (`monthRange`) reusing `BASE_TZ_OFFSET_MS` / the WIB calendar-parts logic in `server/core/domain/services/accrual.ts`, so report and accrual share one definition of a local month boundary.
- **Validation**: a `monthParam` zod schema (`YYYY-MM`) in `shared/schemas.ts`.
- **DTO**: new `SpendingReportDto` (+ row and delta shapes) in `shared/dto.ts`.
- **API**: new `GET /api/reports/spending?month=YYYY-MM`.
- **UI**: new `app/pages/insights.vue` (month picker, total + delta header, ranked category rows with share bars and deltas, "quiet" footer); a bottom-nav entry; `app/composables/useApi.ts` extended.
- **Tests**: read-model aggregation, WIB month-boundary edges (late-night expense, month with no spend), delta rules (percentage, tiny-base absolute, NEW, quiet), and exclusion of income/transfers.
