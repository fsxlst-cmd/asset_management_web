## Why

People hold value in many places (bank accounts, e-wallets, physical cash, prepaid cards) and many forms (cash, gold, bonds, stock). Existing tools force a single accounting model: either pure manual snapshots (no spending insight) or full double-entry ledgers (too much effort to keep every account live). Neither fits how a person actually behaves — they check balances occasionally, but want tight daily control over spending.

This change establishes the foundation of a personal asset management system, scoped in phase 1 to **cash and cash-equivalents**. It is designed so future asset types (gold, bonds, stock) plug into the same structure without rework.

## What Changes

- Introduce a layered domain spine: **Account** (a place money sits) → **Holding** (how much of one asset is in that place) → **Asset** (what the thing is). In phase 1 the only asset is cash, but the structure is asset-type agnostic.
- Separate **two independent subsystems** that answer different questions and cross-check each other:
  - *Net worth* — accounts and holdings, maintained by **snapshot** (the user types the real balance during weekly reconciliation).
  - *Spending* — a **cashflow ledger** (income/expense/transfer) and **budget envelopes**, maintained daily.
- Make per-account accuracy a **gradient the user controls**: every expense carries an *optional* source-account tag. Tagged transactions update an account's live balance; untagged ones are absorbed at the next snapshot.
- Model budgets as **running-balance envelopes** with automatic carryover (an unspent allowance rolls forward) that may go negative when overspent. The user creates, edits, and deletes their own recurring budgets — none are seeded.
- Provide a **weekly reconciliation + cross-check**: comparing the net-worth change against the logged cashflow reveals untracked spending.

## Capabilities

### New Capabilities
- `accounts-holdings`: Accounts (places), the asset catalog, holdings, and snapshot-based net worth.
- `cash-transactions`: The cashflow ledger — income, expense, and transfer entries with optional account tagging.
- `budget-envelopes`: Budget envelopes with daily accrual, automatic carryover, and overspend handling.
- `reconciliation`: Weekly balance snapshots and the cross-check between net-worth change and logged cashflow.

### Modified Capabilities
<!-- None — greenfield. -->

## Impact

- Greenfield project; no existing code affected.
- Establishes the core data model that all future phases (gold, bonds, stock) extend.
- Technical/design decisions (storage, platform, recompute checkpointing) are intentionally deferred to a later design phase.

## Non-goals (phase 1)

- Non-cash assets (gold, bonds, stock) — structure supports them, but they are not implemented now.
- Automatic bank/e-wallet sync — all entry is manual.
- Multi-currency conversion — single base currency (IDR) assumed for now.
- Forecasting, goals, and reporting analytics beyond the reconciliation cross-check.
