## Context

This change establishes the technical foundation for a personal asset management system, scoped in phase 1 to cash and cash-equivalents (see `proposal.md`). The domain spine (Account → Holding → Asset) and the two cross-checking subsystems (snapshot-driven **net worth**, ledger-driven **spending**) are specified in `specs/`. This document records the technology and architecture decisions the proposal deliberately deferred.

**Constraints established with the stakeholder (the user, sole developer & sole user):**

- **Deployment / user model:** single user, running **locally** on their own machine. No multi-tenant data, no internet-facing surface in phase 1.
- **Stack:** Vue 3 + Nuxt (using the built-in **Nitro** server for the backend), **SQLite** for storage, **Drizzle** as the typed access layer.
- **Engineering values, in priority order:** correctness/security of financial data, human-readable code, SOLID structure, and aggressive reuse of UI components.
- **Currency:** single base currency IDR, formatted `Rp 1.250.000` (see `design/calm_fintech_system/DESIGN.md` for the design system).

## Goals / Non-Goals

**Goals:**

- A layered architecture where the **domain** (entities, the derivation model, the cross-check math) is framework-agnostic and unit-testable with zero infrastructure.
- Financial-data integrity: money never represented as a float; multi-step operations (transfer, snapshot) are atomic.
- A security posture *proportionate to a single-user local app* — effort spent on data integrity, input validation, and at-rest safety rather than auth machinery there is no surface for.
- A small, reusable component kit driven by the existing design tokens, so every screen composes from shared primitives.
- A structure that lets future asset types (gold, bonds, stock) and a possible future hosted/multi-user mode plug in without rework.

**Non-Goals:**

- Multi-user auth, sessions, CSRF, rate limiting, multi-tenant isolation (no surface in phase 1; revisit if hosted).
- A separate standalone backend service — Nitro *is* the Node backend.
- Non-cash assets, bank sync, multi-currency, analytics beyond the reconciliation cross-check (per proposal non-goals).
- Real-time sync or multi-device. The SQLite file is the single source of truth on one machine.

## Decisions

### Decision 1: Nuxt + Nitro as a single full-stack app (no separate backend)

The backend lives in Nuxt's `server/api` (Nitro) rather than a standalone Express/Fastify service.

- **Why:** One repo, one deploy, and end-to-end shared TypeScript types between client and server. For a single-user local app a separate process boundary adds operational cost with no benefit.
- **Alternative considered:** Standalone Fastify service called over HTTP. Rejected for phase 1 — more moving parts, duplicated types, no isolation requirement that justifies it. The layered architecture below means the domain core could be lifted into a separate service later if a hosted multi-user mode ever needs it.

### Decision 2: Layered architecture with inward-pointing dependencies

```
PRESENTATION   app/        Vue components, pages, Pinia (view state only)
      │  HTTP (typed via shared/)
TRANSPORT      server/api/ Nitro routes — THIN: validate → use-case → map result
      │
APPLICATION    server/core/application/   use-cases orchestrating domain + repos
      │
DOMAIN         server/core/domain/        entities, value objects, domain services
      ▲                                    (pure — no Nuxt, Nitro, or Drizzle)
PORTS          server/core/ports/         repository INTERFACES
      ▲
INFRASTRUCTURE server/infrastructure/      Drizzle/SQLite adapters implement ports
```

- **The load-bearing rule:** `server/core/` imports nothing from Nuxt, Nitro, or Drizzle. Dependencies point inward only. This is the Dependency-Inversion + Single-Responsibility payoff: domain rules and the cross-check math are unit-testable with no database, and Drizzle/Nitro become swappable details behind interfaces.
- **Why:** Directly serves the stated SOLID + readability goals, and keeps the derivation model (Decision 5) a domain concern that never leaks into table shapes or HTTP handlers.
- **Alternative considered:** Logic in Nitro route handlers / Pinia stores (the common Nuxt shortcut). Rejected — it scatters financial rules across transport and view layers and makes them untestable in isolation.

**Proposed structure:**

```
app/
  components/   MoneyText, AmountInput, SegmentedToggle, Card, BottomNav,
                AccountCard, TransactionRow, EnvelopeBar ...
  pages/        index (dashboard), accounts, accounts/[id], add, budgets,
                budgets/[id], reconcile
  stores/       Pinia — view state only
  composables/  useMoneyFormat, useApi ...
server/
  api/          accounts/, transactions/, budgets/, reconciliation/
  core/
    domain/     Account, Holding, Asset, Envelope, AccrualRule, LedgerEntry,
                Money (value object), services: netWorth, envelopeBalance,
                liveBalance, crossCheck
    application/ LogExpense, LogIncome, RecordTransfer, CreateAccount,
                 TakeSnapshot, RunCrossCheck, GetDashboard ...
    ports/      AccountRepository, HoldingRepository, LedgerRepository,
                EnvelopeRepository, SnapshotRepository, UnitOfWork
  infrastructure/
    db/         drizzle schema + migrations + connection
    repositories/ SQLite implementations of each port
shared/         zod schemas + DTO types shared by client and server
```

### Decision 3: Money as integer rupiah wrapped in a `Money` value object

All monetary amounts are stored and computed as **integers** (whole rupiah; the smallest unit IDR is used in practice). A `Money` value object is the only type allowed to carry an amount through the domain.

- **Why:** Floating point silently corrupts financial data (`0.1 + 0.2 ≠ 0.3`). Integers + a value object make raw, lossy arithmetic impossible by construction and centralize formatting/sign rules.
- **DB representation:** `INTEGER` columns. SQLite stores these exactly.
- **Alternative considered:** `REAL`/float columns, or a decimal string library. Float rejected outright. A decimal library is unnecessary because IDR has no fractional unit in use; integers are simpler and exact.

### Decision 4: Drizzle behind repository interfaces

Drizzle ORM provides typed, SQL-visible queries; each `ports/*Repository` interface is implemented by a thin Drizzle adapter in `infrastructure/repositories/`.

- **Why:** Drizzle gives readable, SQL-like queries with strong TS inference and lightweight migrations — fitting the readability goal — while the repository interfaces preserve dependency inversion and keep the domain swappable. Drizzle parameterizes all values, closing the SQL-injection vector.
- **Alternative considered:** Raw `better-sqlite3` (more boilerplate, hand-rolled mapping) and Prisma (heavier, more magic, async-only generated client). Drizzle is the middle ground that keeps SQL legible without hand-writing it.
- **Transactions:** a `UnitOfWork` port wraps multi-statement operations in a single SQLite transaction so a transfer or snapshot can never half-apply.

### Decision 5: Derive-on-read balances; lazy accrual

Live account balances and envelope balances are **computed from the ledger on read**, not stored as mutable running totals.

```
liveBalance(account)   = lastSnapshot(account) + Σ tagged ledger movements since that snapshot
envelopeBalance(env)   = accruedSoFar(env) − Σ expenses assigned to env
accruedSoFar(env)      = rule.rate × elapsed(rule.anchor → now)     // lazy, not materialized
netWorth               = Σ holding.value                            // from latest snapshots
```

- **Why:** Editing or deleting a past transaction is the obvious correctness hazard for stored running totals — they drift and need careful recompute. Derive-on-read makes correctness automatic: the balance is always a pure function of the ledger. At personal scale (hundreds–thousands of rows) folding on read is trivially fast in SQLite. Lazy accrual (`rate × days_elapsed`) avoids a background cron writing daily rows and means changing the rate naturally affects only future periods, exactly as the budget-envelopes spec requires.
- **Alternative considered:** Stored-and-mutated balances (increment a column per transaction) — faster reads but fragile under edits, and a materialized daily-accrual cron — both add moving parts and recompute bugs for no benefit at this scale.
- **Escape hatch:** if a fold ever gets slow, periodic **snapshot/checkpoint rows** already exist (reconciliation produces them) and can bound the fold window. No redesign needed.
- **Accrual day boundary = local midnight (WIB):** elapsed periods are counted in the app's base timezone, **WIB (Asia/Jakarta, UTC+7, no DST)**, so a daily budget rolls over at the user's local midnight — not 00:00 UTC. WIB has no daylight-saving, so a fixed offset (`BASE_TZ_OFFSET_MS` in `accrual.ts`) is exact and keeps the domain pure (no Intl/tz database). Anchors are stored as absolute timestamps (epoch ms), so the boundary is purely a read-time computation — changing the base timezone needs no data migration.

### Decision 6: Security posture for single-user local

| Area | Decision |
|------|----------|
| Input validation | `zod` schemas in `shared/`, enforced at every Nitro route boundary. Bad data is the real corruption risk. |
| SQL injection | Drizzle parameterization; never string-build SQL. |
| XSS | Rely on Vue's default escaping; **never** `v-html` on user notes/names. |
| Data integrity | Money-as-integer (Decision 3) + atomic `UnitOfWork` (Decision 4). |
| At-rest safety | Encrypt the SQLite file at rest (e.g. SQLCipher-compatible driver or OS-level), so a lost laptop ≠ exposed net worth. |
| App lock | Optional local PIN/passphrase to open the app — deferred, low priority, recorded as an open question. |
| Dependencies | Committed lockfile, minimal trusted dependency set, periodic `npm audit`. |
| Secrets | None in client bundle; no third-party API keys in phase 1. |

- **Why:** With no network/multi-tenant surface, security effort is deliberately steered toward financial-data integrity and at-rest safety rather than auth/session/CSRF machinery that would protect against threats that do not exist in this deployment.

### Decision 7: Styling via Tailwind with the design's embedded token config as source of truth

Styling uses **Tailwind CSS** (via the Nuxt Tailwind module), and the canonical theme is the `tailwind.config` **already embedded identically in every mockup** under `design/*/code.html` — not a re-derivation.

- **Why:** All six approved mockups ship the same Tailwind config (semantic colors `primary`/`secondary`/`tertiary`/`surface-*`, custom spacing `stack-sm|md|lg`/`gutter`/`container-padding-*`, `borderRadius`, Inter `fontSize` scale incl. `display-currency`). Lifting it verbatim into a shared `tailwind.config` guarantees the build matches the design and gives one place to change tokens.
- **Token source-of-truth note:** where the mockups' config and `design/calm_fintech_system/DESIGN.md` disagree (notably `borderRadius`: the mockups use `xl = 0.75rem` for cards while DESIGN.md narrates 16px), **the mockup config wins** because it is the realized, visually-approved design. DESIGN.md remains the prose rationale.
- **Icons:** Material Symbols Outlined (icon font) as used throughout the mockups; `AccountKindIcon` maps account kind → symbol (`account_balance` bank, `account_balance_wallet`/`wallet` e-wallet, `payments`/`savings` cash, `credit_card` prepaid).
- **Type:** Inter, with tabular numerals (`tnum`) enforced on all money via `MoneyText`.
- **Responsive:** mobile-portrait first, but the mockups include `md:`/`lg:` breakpoints (e.g. the desktop side-rail in `account_detail`), so components are built responsive, not mobile-locked.

### Decision 8: Reusable component kit, derived from the actual mockups

Build the kit once against the mockups, then compose every screen from it. The inventory below is taken directly from the realized screens, not invented:

- **Primitives:** `MoneyText` (Rp prefix lighter than digits, tnum, red `tertiary`/`error` for negative, green `secondary` for positive), `AmountInput` (large centered numeric entry, dashboard `add` screen), `SegmentedToggle` (pill track with sliding active surface — Expense/Income/Transfer), `Card`, `LabeledInput`, `PickerField` (tappable selector row with leading icon + chevron, used for budget/account pickers), `ProgressBar`, `AccountKindIcon`.
- **Layout shells:** `TopAppBar` (sticky, profile + title + settings/back), `BottomNav` (glass/blur, Home · Accounts · + · Budgets · More, active-dot indicator, center FAB variant), `FloatingActionButton`, `NetWorthFooterBar` (the indigo sticky footer on Accounts).
- **Domain molecules:** `AccountCard` (two variants: horizontal-scroll hero card on dashboard, and list-row on Accounts/grouped-by-kind), `TransactionRow` (icon + name + tag, signed amount + timestamp), `BudgetEnvelopeCard` (running balance, accrual caption, progress + weekly mini-bars), `EnvelopeRow`, `ReconcileAccountRow` (app-balance vs real-balance input), `CrossCheckCard` (the "you logged X, ~Y untracked" insight with "Add as expense" / "Keep as is" actions), `StatTile` (bento stat).
- **Why:** Directly serves the reuse goal and guarantees consistent money formatting and color semantics across all six screens, matching the mockups.

### Decision 9: Build the design's visual shell, but wire only phase-1 data (no fabricated values)

The mockups depict features beyond the phase-1 specs. Per stakeholder decision, phase 1 **keeps spec scope** and **does not fabricate data**:

- **Envelopes:** implement only the **running-balance accrual** envelope per `budget-envelopes/spec.md`. The design's **goal** envelopes (Emergency Fund "% of goal") and **fixed-limit / due-date** envelopes (Rent, Shopping "Limit Rp …") are **deferred to a later phase** — not built now.
- **Omitted in phase 1 (no real data source):** trend percentages ("+2.4%"), sparklines/monthly-trend bars, and "Smart Insight" / "Smart Allocation" AI suggestion cards. These are dropped rather than shown with placeholder numbers, to avoid presenting fabricated figures in a finance app.
- **Kept because computable from phase-1 data:** per-account income/expense context, the reconciliation cross-check, and a logging-accuracy figure derived from the cross-check.
- **Why:** Honors the proposal's non-goals and the specs, keeps the build truthful, and leaves the layout ready to host the deferred features later without rework.

### Decision 10: Budget envelopes are user-managed, not seeded

The system seeds only the cash asset; it does **not** create any budget envelope. The user creates, edits the accrual rate of, and deletes their own recurring budgets (`budget-envelopes/spec.md`).

- **Create / edit / delete:** `CreateEnvelope`, `EditAccrual`, `DeleteEnvelope` use-cases, exposed as `POST /api/budgets`, `PATCH /api/budgets/:id/accrual`, `DELETE /api/budgets/:id`.
- **Delete guard:** deleting a budget that has expenses charged to it is refused (the spec requires every expense to keep a valid budget). The user clears the expenses first or keeps the budget.
- **Onboarding consequence:** because an expense requires a budget, with zero budgets the Add-Expense screen prompts the user to create one first rather than failing.
- **Edit preserves the past via re-anchor:** changing the rate freezes the accrued-so-far into the rule's `baseline` and re-anchors to "now", so only future accruals use the new rate.
- **Why:** The stakeholder wants full control over recurring budgets and a clean start with no pre-filled record. A seeded envelope contradicted both.
- **Alternative considered:** keep seeding a default "Daily Spending" envelope for convenience. Rejected — the user explicitly wanted to start empty and manage budgets themselves.

## Risks / Trade-offs

- **Derive-on-read could slow down as the ledger grows** → At personal scale it won't; reconciliation snapshots already provide checkpoint rows to bound the fold if it ever does. Measure before optimizing.
- **Lazy accrual depends on a correct time anchor** → Store an explicit `anchor` timestamp per accrual rule and compute elapsed periods from it deterministically; cover with unit tests for day boundaries and rate changes.
- **At-rest encryption adds setup friction (key management on a local machine)** → Keep it optional-but-default; document the recovery story so a lost key doesn't mean lost data.
- **Single SQLite file = single point of loss** → Provide a simple export/backup of the file; out of scope to automate in phase 1 but called out so the user backs up.
- **Discipline risk: logic leaking into Nitro routes / Pinia** → Enforced by the inward-dependency rule and by keeping route handlers and stores demonstrably thin; the domain's unit tests are the guardrail.
- **Future hosted/multi-user mode would expand the security surface dramatically** → The layered core is designed so auth/isolation can be added at the transport/application layers without touching domain logic; explicitly out of scope now.
- **Mockups show more than phase-1 builds (goal/limit envelopes, trends, AI insights)** → Decision 9 builds the visual shell but wires only spec-backed data and defers/omits the rest; components are structured so deferred envelope types and trend data can slot in later without re-layout.
- **Token drift between `DESIGN.md` prose and the mockup `tailwind.config`** → Decision 7 names the mockup config as source of truth; the shared config is the single edit point so the two can't silently diverge again.
- **Same-day accrual edit double-counts (re-anchor, Decision 10)** → Creating a budget and changing its rate on the same calendar day stacks both periods' allowance (old rate's day-1 baseline + new rate's day-1). Editing on a later day behaves correctly. A precise fix needs segmented rate history; deferred as an Open Question since normal usage edits days/weeks apart.

## Migration Plan

Greenfield — no data migration. Rollout is local:

1. Scaffold the Nuxt app and the layered folder structure.
2. Establish Drizzle schema + initial migration; seed the cash asset.
3. Implement domain + use-cases with unit tests, then repositories, then Nitro routes, then UI.
4. "Deploy" = run locally (`nuxt build` / dev server) on the user's machine.

Rollback is trivial at this stage (greenfield, version-controlled, backup the SQLite file before running migrations).

## Open Questions

- **App lock (PIN/passphrase):** include in phase 1 or defer? Leaning defer.
- **At-rest encryption mechanism:** SQLCipher-compatible driver vs OS-level disk encryption vs application-level — pick during setup.
- **Accrual granularity:** is daily the only supported period in phase 1, or should the rule model allow weekly/monthly from the start (model allows it; UI may expose only daily)?
- **Backup ergonomics:** manual file copy for phase 1, or a one-tap export — confirm scope.
- **Deferred envelope types (resolved for now):** goal-based and fixed-limit/due-date envelopes seen in the Budgets mockup are out of phase-1 scope (Decision 9); revisit as a follow-up change when prioritized.
- **Segmented accrual history:** should rate changes track a full list of (rate, from) segments to fix the same-day double-count, instead of the single baseline+anchor re-anchor (Decision 10)? Deferred; current behavior is correct for edits made on later days.
- **New-budget day-1 allowance:** a new daily budget shows its full amount on creation day (today counts as the first accrual). Keep, or anchor to the next period so it starts at zero? Currently keeps the spec's carryover semantics.
- **Tailwind delivery:** Nuxt Tailwind module vs hand-wired PostCSS — confirm at scaffold time; either way the embedded mockup config is reused verbatim.
