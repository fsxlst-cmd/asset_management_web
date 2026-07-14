## 1. Domain — WIB month range

- [x] 1.1 Add a shared `monthRange(year, month): { start: Date; end: Date }` helper (in `server/core/domain/services/accrual.ts` or a new `month-range.ts` beside it) returning the half-open `[first-of-month 00:00 WIB, first-of-next-month 00:00 WIB)`, reusing `BASE_TZ_OFFSET_MS` and the existing WIB calendar-parts logic
- [x] 1.2 Unit-test boundaries: a late-night last-day expense lands in its WIB month; an expense at exactly next-month 00:00 WIB lands in the next month; December→January year rollover

## 2. Validation schema

- [x] 2.1 Add a `monthParam` zod schema to `shared/schemas.ts` parsing `YYYY-MM` into `{ year, month }` (month 1–12), rejecting malformed input; export its type

## 3. DTOs

- [x] 3.1 Add to `shared/dto.ts`: `SpendingCategoryRowDto { categoryId, categoryName, amount, share, thisMonth, lastMonth, deltaKind: 'percent' | 'absolute' | 'new', deltaPercent?, deltaAbsolute? }`, `SpendingQuietRowDto { categoryId, categoryName, lastMonth }`, and `SpendingReportDto { month, total, totalLastMonth, totalDeltaPercent?, rows: SpendingCategoryRowDto[], quiet: SpendingQuietRowDto[] }`

## 4. Read model

- [x] 4.1 Add `getSpendingReport({ year, month })` to `server/core/application/read-model.ts`: one `repos.ledger.list()`, filter to `type === 'expense'`, partition into this-month and prior-month using `monthRange`
- [x] 4.2 Group each partition by `categoryId` (summing `amount`); resolve names via `categoryNames('expense')` (tolerates archived); fold a missing/unresolved category into a single "Uncategorised" bucket
- [x] 4.3 Build ranked rows (this-month groups, sorted by amount desc) with `share = amount / total`; compute the per-category delta with the tiny-base rule — percentage when `lastMonth > THRESHOLD`, absolute when `0 < lastMonth ≤ THRESHOLD`, `new` when `lastMonth === 0`
- [x] 4.4 Build the `quiet` list (categories with prior-month spend and none this month) and the month-total comparison; define the threshold as a single named constant (proposed `Rp 50,000`)
- [x] 4.5 Unit-test: per-category sums; income/transfer excluded; ranking + shares; percentage vs absolute vs NEW delta; quiet list; uncategorised bucket; empty month returns zero total and no rows

## 5. API route

- [x] 5.1 Add `GET /api/reports/spending` reading `?month=YYYY-MM` via `monthParam`, calling `getSpendingReport`, returning `SpendingReportDto`; default to the current WIB month when `month` is absent

## 6. UI

- [x] 6.1 Add `app/pages/insights.vue`: month picker (clamped to the data range), header showing month total + delta vs last month, ranked category rows with share bars and per-row delta badges (percent / +abs / NEW), and a "quiet this month" footer
- [x] 6.2 Extend `app/composables/useApi.ts` with `getSpendingReport(month)`
- [x] 6.3 Reuse existing presentation components where they fit (`MoneyText`, `ProgressBar`, `AppCard`) for amounts, share bars, and section cards
- [x] 6.4 Update `app/components/BottomNav.vue`: turn the "More" entry into a hub linking Insights, Reconcile, and Categories (per design Decision 6), or route "More" to Insights with Reconcile/Categories reachable from it

## 7. Verification

- [x] 7.1 Run the full test suite and `eslint`; manually confirm a month with real data ranks categories correctly, deltas match the prior month, late-night/boundary expenses fall in the right month, and income/transfers are excluded
