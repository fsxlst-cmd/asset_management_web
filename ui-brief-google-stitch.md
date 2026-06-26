# Personal Asset Management — UI Brief (Phase 1: Cash)

A mobile-first personal finance app for tracking cash assets and daily spending. Clean, calm, modern fintech aesthetic. Indonesian Rupiah (IDR) as the currency, formatted as `Rp 1.250.000`. Light theme with one accent color; generous white space; rounded cards; large readable numbers.

## Core mental model (important for layout)

The app has **two separate but connected views**:
1. **Net Worth** — *how much I have*, across all the places money sits (accounts).
2. **Spending** — *am I within budget*, tracked daily against envelopes.

These are kept separate on purpose. Don't merge them into one balance.

## Key concepts (entities the UI shows)

- **Account** — a *place* money sits: a bank account, e-wallet (GoPay, OVO, Dana), physical cash wallet, or prepaid card. Has a name, a kind/type, and a balance. Examples: "BCA Utama" (bank), "GoPay" (e-wallet), "Dompet" (physical cash), "Kartu e-Toll" (prepaid card).
- **Net worth** — the sum of all account balances.
- **Budget envelope** — a spending allowance with a *running balance* that carries over. Example: "Daily Spending" accrues Rp 100.000/day; if unused it rolls over (spend 60k today → 140k available tomorrow); it can go negative if overspent.
- **Transaction** — three types: **Expense** (money out, assigned to a budget, optionally tagged with the account it was paid from), **Income** (money in, optionally tagged with the account it landed in), **Transfer** (money moved between two accounts).
- **Reconciliation** — a weekly flow where the user types the real balance of each account to correct drift, and sees a "cross-check" of how much spending went untracked.

---

## Screens to generate

### 1. Home / Dashboard
- Top: large **Net Worth** total (`Rp ...`), with a small caption "Last updated 3 days ago".
- Below it: a horizontally scrollable row or stacked list of **account cards**, each showing account name, kind icon (bank, wallet, e-wallet, card), and balance.
- A prominent **"Daily Spending" budget card**: shows remaining balance today (e.g. `Rp 140.000 left`), the daily accrual (`+Rp 100.000/day`), and a progress indicator. Use a calm color when positive, a warning color when negative.
- A floating **"+" action button** to add a transaction.
- A small section "Recent transactions" — last 3–5 entries with icon, name, amount (red for expense, green for income), and budget/account tag.

### 2. Accounts list
- List of all accounts grouped by kind (Bank, E-Wallet, Cash, Prepaid Card).
- Each row: icon, name, institution (if any), balance.
- Footer total = net worth.
- Tapping an account opens its detail.

### 3. Account detail
- Header: account name, kind, current balance.
- A subtle "accuracy" note: "Live-tracked" vs "Updated weekly" badge.
- List of transactions tagged to this account.
- Button: "Update balance" (snapshot entry).

### 4. Add transaction (the most-used screen — make it fast)
- A segmented toggle at top: **Expense / Income / Transfer**.
- **Expense mode**: big amount input (numeric keypad), required **Budget** selector (default "Daily Spending"), **optional** "Paid from account" selector (clearly optional, can be left blank), date (default today), optional note.
- **Income mode**: amount, optional "Deposited to account", date, note.
- **Transfer mode**: amount, "From account", "To account", date, note.
- Large "Save" button.

### 5. Budgets
- List of budget envelopes (phase 1 may have just "Daily Spending").
- Each: name, current running balance (can be negative, shown in red), accrual rule (`Rp 100.000/day`), and a small sparkline or progress bar.
- Tapping opens budget detail: running-balance history, list of expenses charged to it, and an "Edit accrual" option.

### 6. Reconciliation (weekly)
- Title: "Weekly check-in".
- A list of accounts, each with the current app balance and an input to type the **real balance**.
- After saving: a **cross-check summary card** — "Your net worth dropped Rp 1.200.000. You logged Rp 980.000 of spending. ~Rp 220.000 untracked." Present this as insight, not error.

---

## Style direction
- Mobile portrait first.
- Card-based, rounded corners (~16px), soft shadows.
- One accent color (suggest a calm teal or indigo). Green for income/positive, red/amber for expense/negative.
- Large tabular numerals for money.
- Bottom navigation bar: **Home · Accounts · + · Budgets · More**.
- Friendly, uncluttered, trustworthy. Avoid heavy charts in phase 1 — focus on clear numbers and fast entry.
