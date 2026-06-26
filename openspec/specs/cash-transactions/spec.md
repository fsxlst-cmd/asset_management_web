# cash-transactions

## Purpose

Defines how money movement is recorded: cashflow entries (expense, income, transfer), the required budget plus optional source account on expenses, the per-account accuracy gradient driven by tagging, optional income destinations, and transfers that move value with no net-worth change.

## Requirements

### Requirement: Cashflow entries record money movement

The system SHALL record cashflow entries of three types: expense (money out), income (money in), and transfer (money moved between two accounts). Each entry MUST have an amount and a date, and may have a note. Expense and income entries MUST additionally be assigned a category of the matching kind; transfers are not categorised.

#### Scenario: Logging an expense

- **WHEN** the user logs an expense with an amount, date, budget envelope, and an expense category
- **THEN** an expense entry is stored
- **AND** it reduces the remaining balance of its budget envelope

#### Scenario: Logging income

- **WHEN** the user logs income with an amount, date, and an income category
- **THEN** an income entry is stored

#### Scenario: Logging a transfer

- **WHEN** the user records a transfer with an amount, date, source, and destination
- **THEN** a transfer entry is stored without a category

### Requirement: Income and expenses carry a required category

Every income entry and every expense entry SHALL be assigned exactly one category whose kind matches the entry type. The category is a classification label independent of the budget envelope: an expense therefore carries both a required budget envelope (intent to spend) and a required category (what it was). Categories carry no budget, target, or accrual. Pre-existing entries created before categories were introduced SHALL be assigned a system "Other" category of the matching kind so that no historical entry is left without a category.

#### Scenario: Logging an expense requires a category

- **WHEN** the user logs an expense
- **THEN** the expense is stored only if an active expense-kind category is assigned
- **AND** the stored expense carries both its budget envelope and its category

#### Scenario: Logging income requires a category

- **WHEN** the user logs income
- **THEN** the income is stored only if an active income-kind category is assigned

#### Scenario: An entry without a category is rejected

- **WHEN** the user attempts to log income or an expense without choosing a category
- **THEN** the entry is rejected
- **AND** nothing is stored

#### Scenario: Existing entries are backfilled

- **WHEN** the system migrates data created before categories existed
- **THEN** each existing income entry is assigned the system "Other" income category
- **AND** each existing expense entry is assigned the system "Other" expense category

### Requirement: Expenses carry a required budget and an optional source account

Every expense SHALL be assigned to exactly one budget envelope. An expense MAY optionally name the source account it was paid from. The budget assignment is mandatory; the source account is not.

#### Scenario: Expense without a source account

- **WHEN** the user logs an expense and assigns a budget but leaves the source account blank
- **THEN** the expense is valid
- **AND** it affects the budget envelope but no account's live balance

#### Scenario: Expense with a source account

- **WHEN** the user logs an expense, assigns a budget, and tags a source account
- **THEN** the expense affects the budget envelope
- **AND** it also reduces the live balance of the tagged account

### Requirement: Account accuracy is a per-account gradient

Tagging an expense with a source account SHALL update that account's live balance; untagged spending is not reflected in any account until the next snapshot. The system therefore supports a continuum from fully snapshot-only accounts to mostly-live accounts, decided per transaction by the user.

#### Scenario: Mixed tagging across accounts

- **WHEN** the user consistently tags expenses from one account but rarely tags another
- **THEN** the consistently-tagged account's live balance stays close to reality between snapshots
- **AND** the rarely-tagged account's balance is only corrected at the next snapshot

### Requirement: Income may name a destination account

An income entry MAY optionally name the destination account it landed in. When tagged, it SHALL increase that account's live balance.

#### Scenario: Tagged income

- **WHEN** the user logs income and tags a destination account
- **THEN** that account's live balance increases by the amount

### Requirement: Transfers move value between accounts with no net-worth change

A transfer SHALL name a source account and a destination account and move an amount between them. A transfer MUST NOT belong to a budget envelope and MUST NOT change total net worth. Transfers only affect balances of accounts that are being tracked live.

#### Scenario: Transfer between two accounts

- **WHEN** the user records a transfer from one account to another
- **THEN** the source account's live balance decreases and the destination's increases by the same amount
- **AND** total net worth is unchanged
- **AND** no budget envelope is affected
