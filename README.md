# Personal Asset Management — Phase 1 (Cash)

A local-first personal finance app for tracking cash assets and daily spending.
Mobile-first, calm fintech aesthetic, Indonesian Rupiah (`Rp 1.250.000`).

Built with **Nuxt 3 (Vue 3 + Nitro)**, **SQLite via Drizzle**, following a layered,
SOLID architecture. See `openspec/changes/cash-asset-tracking/` for the proposal,
specs, design decisions, and task list.

## Architecture (the short version)

Dependencies point **inward only** (see `server/core/ARCHITECTURE.md`):

```
app/                Vue pages + components (presentation)
server/api/         Nitro routes — thin: validate → use-case → map errors
server/core/        PURE domain + application use-cases (no Nuxt/Drizzle here)
  domain/             Money value object, entities, services (net worth, balances,
                      accrual, envelope balance, cross-check)
  application/        use-cases (LogExpense, TakeSnapshot, RunCrossCheck, ReadModel…)
  ports/              repository interfaces, Clock, IdGenerator, UnitOfWork
server/infrastructure/ Drizzle/SQLite adapters that implement the ports
shared/             DTOs + zod schemas + money formatter (client ⇄ server contract)
```

Key decisions: money is **integer rupiah** (never a float); balances are
**derived on read** (snapshot + tagged movements); accrual is **lazy** (`rate × periods`).

## Prerequisites

- Node.js 20+ (built and tested on Node 22)

## Setup & run

```bash
npm install

# Create the SQLite database, apply migrations, and seed the cash asset + Daily Spending envelope
npm run db:migrate
npm run db:seed

npm run dev          # http://localhost:3000
```

Production:

```bash
npm run build
node .output/server/index.mjs
```

## Tests

The domain and use-cases are unit-tested with zero infrastructure:

```bash
npm run test         # 40 tests across Money, services, and use-cases
```

## Database

- The database lives at `./data/assetmanagement.db` (override with `DATABASE_PATH`).
- WAL journaling and foreign keys are enabled.
- Schema changes: edit `server/infrastructure/db/schema.ts`, then
  `npm run db:generate` to create a migration and `npm run db:migrate` to apply it.

### Backup / export

The whole database is a single file. To back it up, copy it while the app is **not**
writing (or use SQLite's online backup):

```bash
cp ./data/assetmanagement.db "./backups/assetmanagement-$(date +%F).db"
```

Keep backups out of version control (`.gitignore` already excludes `/data/` and `*.db`).

### At-rest encryption (optional)

Per design Decision 6, the database can be encrypted at rest:

1. `npm i better-sqlite3-multiple-ciphers` and point the driver import at it.
2. Set `DATABASE_KEY=<passphrase>` — `server/infrastructure/db/client.ts` issues
   `PRAGMA key` on open. With the stock `better-sqlite3` driver this is a no-op.

Store the key outside the repo; losing it means losing access to the data.

## Security posture (single-user, local)

This app is scoped to a single user on their own machine, so effort goes to
data integrity and input safety rather than auth machinery:

- All input validated with zod at every API route.
- All SQL parameterised by Drizzle (no string-built queries).
- Vue escapes interpolation; user notes are never rendered with `v-html`.
- Money is integer-only end to end; transfers/snapshots are atomic (`UnitOfWork`).

> **Note:** `npm audit` reports findings in `drizzle-kit`'s dev-only `esbuild`
> dependency. These affect the migration tooling, not the runtime bundle, and are
> acceptable for a local app. Do not `npm audit fix --force` (it breaks drizzle-kit).
# asset_management_web
