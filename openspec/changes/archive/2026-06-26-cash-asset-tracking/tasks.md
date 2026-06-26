## 1. Project scaffold & tooling

- [x] 1.1 Initialize Nuxt 3 (Vue 3) app with TypeScript and the Nitro server enabled
- [x] 1.2 Add dependencies: `drizzle-orm`, SQLite driver (better-sqlite3 / SQLCipher-compatible), `drizzle-kit`, `zod`, `pinia`, Tailwind (Nuxt Tailwind module + `@tailwindcss/forms`); pin a committed lockfile
- [x] 1.3 Create the layered folder structure (`app/`, `server/api/`, `server/core/{domain,application,ports}`, `server/infrastructure/{db,repositories}`, `shared/`)
- [x] 1.4 Configure path aliases and a lint rule (or convention doc) enforcing the inward-dependency rule: `server/core/` imports nothing from Nuxt/Nitro/Drizzle
- [x] 1.5 Set up a unit-test runner (Vitest) targeting the framework-agnostic domain
- [x] 1.6 Port the canonical theme: lift the `tailwind.config` embedded in `design/*/code.html` verbatim (colors, `stack-*`/`gutter`/`container-padding-*` spacing, `borderRadius`, Inter `fontSize` scale) into the shared Tailwind config; load Inter + Material Symbols Outlined fonts (mockup config wins over `DESIGN.md` on conflicts — Decision 7)

## 2. Domain core (pure, framework-agnostic)

- [x] 2.1 Implement the `Money` value object (integer rupiah, safe arithmetic, formatting/sign helpers) with unit tests
- [x] 2.2 Define entities: `Asset`, `Account`, `Holding`, `LedgerEntry` (expense/income/transfer), `Envelope`, `AccrualRule`, `Snapshot`
- [x] 2.3 Implement `netWorth()` = sum of holding values (accounts-holdings spec) with tests
- [x] 2.4 Implement `liveBalance(account)` = last snapshot + Σ tagged movements since (derive-on-read, Decision 5) with tests
- [x] 2.5 Implement `accruedSoFar(rule)` lazy accrual (`rate × elapsed` from anchor) covering day-boundary and rate-change cases (budget-envelopes spec) with tests
- [x] 2.6 Implement `envelopeBalance(env)` = accrued − assigned expenses, including carryover and negative-balance cases, with tests
- [x] 2.7 Implement `crossCheck(periodStart, periodEnd)` comparing ΔnetWorth vs logged cashflow, accounting for tagged vs untagged (reconciliation spec) with tests

## 3. Ports & application use-cases

- [x] 3.1 Define repository interfaces in `ports/`: Account, Holding, Asset, Ledger, Envelope, Snapshot, and a `UnitOfWork`
- [x] 3.2 Implement use-cases: `CreateAccount`, `LogExpense` (required budget, optional source account), `LogIncome` (optional destination), `RecordTransfer` (two accounts, no net-worth change, no budget)
- [x] 3.3 Implement use-cases: `TakeSnapshot` (set holding value, record snapshot time) and `RunCrossCheck`
- [x] 3.4 Implement read use-cases: `GetDashboard`, `GetAccounts`, `GetAccountDetail`, `GetBudgets`, `GetBudgetDetail`
- [x] 3.5 Ensure transfer and snapshot use-cases run inside a single `UnitOfWork` transaction (atomicity) with tests using an in-memory fake repository

## 4. Infrastructure (Drizzle + SQLite)

- [x] 4.1 Define the Drizzle schema: assets, accounts, holdings, ledger_entries, envelopes, accrual_rules, snapshots — all money columns as `INTEGER`
- [x] 4.2 Generate the initial migration and a seed that inserts the cash asset (currency unit IDR)
- [x] 4.3 Implement SQLite repository adapters for every `ports/` interface (parameterized queries only)
- [x] 4.4 Implement the `UnitOfWork` over a SQLite transaction
- [x] 4.5 Configure at-rest encryption of the SQLite file (Decision 6) and document the key/recovery story

## 5. API layer (Nitro)

- [x] 5.1 Author `zod` request/response schemas in `shared/` for all endpoints
- [x] 5.2 Implement thin Nitro routes for accounts (list, create, detail) — validate → use-case → map result/errors
- [x] 5.3 Implement thin Nitro routes for transactions (expense, income, transfer)
- [x] 5.4 Implement thin Nitro routes for budgets (list, detail, edit accrual)
- [x] 5.5 Implement thin Nitro routes for reconciliation (submit snapshots, return cross-check summary)
- [x] 5.6 Add consistent error mapping and verify validation rejects malformed/over-large input at every route

## 6. Reusable component kit (derived from the mockups — Decisions 7 & 8)

- [x] 6.1 Build primitives: `MoneyText` (Rp prefix lighter than digits, tnum, `secondary` green positive / `tertiary`/`error` red negative), `AmountInput` (large centered numeric), `SegmentedToggle` (pill track with sliding active surface), `Card`, `LabeledInput`, `PickerField` (icon + label + chevron selector), `ProgressBar`, `AccountKindIcon` (kind → Material Symbol)
- [x] 6.2 Build layout shells: `TopAppBar` (sticky, back/profile + title + settings), `BottomNav` (glass blur, Home · Accounts · + · Budgets · More, active-dot + center FAB variant), `FloatingActionButton`, `NetWorthFooterBar`
- [x] 6.3 Build domain molecules: `AccountCard` (hero horizontal-scroll + list-row variants), `TransactionRow`, `BudgetEnvelopeCard` (running balance + accrual caption + weekly mini-bars), `EnvelopeRow`, `ReconcileAccountRow`, `CrossCheckCard` (with "Add as expense" / "Keep as is" actions), `StatTile`
- [x] 6.4 Add a `useMoneyFormat` composable (IDR `Rp 1.250.000`, signed) and a typed `useApi` client over the shared schemas

## 7. Screens (compose from the kit; match `design/*/code.html`. Phase-1 scope per Decision 9 — omit trend %/sparklines/AI cards, no fabricated data)

- [x] 7.1 Home / Dashboard (`home_dashboard`): net-worth total + "last updated" caption, horizontal-scroll account cards, Daily Spending budget card with progress, recent transactions list, floating add button. Omit per-card trend badges (no time-series)
- [x] 7.2 Accounts list (`accounts_list`): accounts grouped by kind (Bank / E-Wallet / Cash / Prepaid) with per-group subtotal, sticky `NetWorthFooterBar`, row → detail
- [x] 7.3 Account detail (`account_detail`): balance hero, "Live-tracked" vs "Updated weekly" badge, tagged transactions list with search/filter, "Update balance" snapshot action. Omit monthly-trend chart and "Smart Insight" card
- [x] 7.4 Add transaction (`add_transaction`): Expense/Income/Transfer `SegmentedToggle`, large amount entry, `PickerField` for required budget (expense) + optional account tag(s), date (default today), note, Save
- [x] 7.5 Budgets (`budgets_envelopes`): list the running-balance accrual envelope(s) (e.g. Daily Spending) with balance (negative in red), accrual caption, weekly mini-bars; budget detail with running-balance history + edit accrual. Defer goal/limit/due-date envelope types (Decision 9)
- [x] 7.6 Reconciliation (`weekly_reconciliation`): period header, per-account `ReconcileAccountRow` (app balance vs real-balance input), "Calculate cross-check", `CrossCheckCard` framed as insight with "Add as expense" / "Keep as is"; logging-accuracy stat (computed). Omit aspirational tiles
- [x] 7.7 Bottom navigation wired across screens (Home · Accounts · + · Budgets · More) with correct active state per route

## 8. Verification & hardening

- [x] 8.1 End-to-end manual pass of each spec scenario (snapshot, tagged/untagged expense, transfer, carryover, overspend, cross-check gap)
- [x] 8.2 Visual check each screen against its `design/*/screen.png`; confirm shared Tailwind tokens (no ad-hoc colors/spacing) and tnum money formatting
- [x] 8.3 Run `npm audit`; confirm no `v-html` on user input; confirm all money paths use `Money`/integers
- [x] 8.4 Document local run + backup/export of the SQLite file in a README

## 9. User-managed budget envelopes (no seed)

- [x] 9.1 Stop seeding the "Daily Spending" envelope — the seed inserts only the cash asset; the app starts with zero budgets
- [x] 9.2 Add `CreateEnvelope` and `DeleteEnvelope` use-cases (delete refused when expenses are charged); add `delete` to `EnvelopeRepository` (Drizzle + in-memory) with tests
- [x] 9.3 Add routes `POST /api/budgets` (create) and `DELETE /api/budgets/:id` (delete) with zod validation; extend the typed API client
- [x] 9.4 Budgets screen: empty state + "New" create form (name + amount + recurrence); budget detail: "Delete budget" with guard error surfaced
- [x] 9.5 Add-Expense screen: when no budgets exist, prompt to create one first (expense requires a budget) instead of failing
