## ADDED Requirements

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

## MODIFIED Requirements

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
