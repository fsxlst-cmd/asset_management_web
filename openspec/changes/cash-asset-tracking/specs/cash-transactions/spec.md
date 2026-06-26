## ADDED Requirements

### Requirement: Cashflow entries record money movement

The system SHALL record cashflow entries of three types: expense (money out), income (money in), and transfer (money moved between two accounts). Each entry MUST have an amount and a date, and may have a note.

#### Scenario: Logging an expense

- **WHEN** the user logs an expense with an amount and date
- **THEN** an expense entry is stored
- **AND** it reduces the remaining balance of its budget envelope

#### Scenario: Logging income

- **WHEN** the user logs income with an amount and date
- **THEN** an income entry is stored

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
