# budget-envelopes

## Purpose

Defines user-managed budget envelopes: running-balance pools created/edited/deleted by the user, recurring accrual (including the local-midnight WIB day boundary), automatic carryover of unspent allowance, and negative balances when overspent.

## Requirements

### Requirement: Budget envelopes are created, edited, and deleted by the user

The system SHALL NOT seed any budget envelope. The user creates their own recurring
budgets, edits the accrual rate, and deletes a budget they no longer want. Deleting a
budget that has expenses charged to it MUST be refused, so spending history is never
orphaned (every expense keeps a valid budget).

#### Scenario: Starting with no budgets

- **WHEN** the system is initialized
- **THEN** there are no budget envelopes
- **AND** the user can create one with a name and a recurring accrual

#### Scenario: Deleting an unused budget

- **WHEN** the user deletes a budget that has no expenses charged to it
- **THEN** the budget is removed

#### Scenario: Deleting a budget with expenses is refused

- **WHEN** the user tries to delete a budget that has one or more expenses charged to it
- **THEN** the deletion is refused with an explanation
- **AND** the budget and its expenses are left unchanged

### Requirement: A budget envelope is a running balance

A budget envelope SHALL be a named pool with a running balance. The balance increases by accruals and decreases by the expenses assigned to it. The envelope's balance is not tied to any real account — it represents intent to spend, not a place where money sits.

#### Scenario: Envelope balance reflects accruals minus expenses

- **WHEN** an envelope has received accruals and had expenses assigned to it
- **THEN** its remaining balance equals total accruals minus total assigned expenses

### Requirement: Envelopes accrue on a recurring schedule

An envelope MAY have a recurring accrual rule (e.g. 100,000 per day). The accrual rule SHALL be defined separately from the entries it generates, so changing the rate does not rewrite past accruals.

#### Scenario: Daily accrual

- **WHEN** an envelope has a rule of 100,000 per day
- **THEN** each day adds 100,000 to the envelope's running balance

#### Scenario: A new day begins at local midnight (WIB)

- **WHEN** the clock passes 00:00 in the base timezone (WIB, Asia/Jakarta, UTC+7)
- **THEN** a daily envelope counts one additional accrual
- **AND** the rollover happens at the user's local midnight, not at 00:00 UTC

#### Scenario: Changing the accrual rate

- **WHEN** the user changes the daily accrual from 100,000 to 120,000
- **THEN** future accruals use the new rate
- **AND** past accruals are unchanged

### Requirement: Unspent allowance carries over automatically

The envelope MUST NOT be reset between periods. Unspent balance SHALL roll forward simply because accruals keep adding to the same running balance.

#### Scenario: Carryover increases the next day's available amount

- **WHEN** an envelope accrues 100,000 on a day where only 60,000 is spent
- **THEN** the 40,000 remainder stays in the balance
- **AND** after the next day's 100,000 accrual the available balance is 140,000

### Requirement: An envelope may go negative when overspent

If assigned expenses exceed the accrued balance, the envelope balance SHALL go negative, representing borrowing against future accruals. Subsequent accruals bring it back toward zero.

#### Scenario: Overspending drives the balance negative

- **WHEN** an envelope with a 100,000 balance has 120,000 of expenses assigned
- **THEN** its balance becomes -20,000
- **AND** the next 100,000 accrual brings it to 80,000
