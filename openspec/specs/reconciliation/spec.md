# reconciliation

## Purpose

Defines reconciliation: capturing real balance snapshots that become the source of truth, and a cross-check that compares net-worth change against logged cashflow to surface untracked activity, accounting for tagged versus untagged transactions.

## Requirements

### Requirement: Reconciliation captures a balance snapshot

During reconciliation the user SHALL be able to enter the real current balance of one or more accounts' holdings. Each entered balance MUST become the new source-of-truth value for net worth and correct any drift accumulated since the last snapshot.

#### Scenario: Reconciling an account

- **WHEN** the user enters the real balance of an account's cash holding during reconciliation
- **THEN** the holding value is updated to the entered amount
- **AND** the time of the snapshot is recorded

### Requirement: Cross-check compares net-worth change against logged cashflow

For a period between two reconciliations, the system SHALL compare the change in net worth (from snapshots) against the net of logged cashflow (income minus expenses). A difference indicates spending or income that was not logged.

#### Scenario: Logging is complete

- **WHEN** the net-worth change between two snapshots equals logged income minus logged expenses
- **THEN** the cross-check reports the logging as complete for the period

#### Scenario: Untracked spending detected

- **WHEN** the net-worth drop is larger than the logged net cashflow for the period
- **THEN** the cross-check reports the gap as estimated untracked spending

### Requirement: Cross-check accounts for tagged versus untagged transactions

Transactions tagged with an account have already adjusted that account's live balance, so the remaining cross-check gap at reconciliation SHALL reflect only untagged activity and cash drift.

#### Scenario: Tagging narrows the gap

- **WHEN** more expenses in a period are tagged with a source account
- **THEN** the unexplained gap reported by the cross-check at the next reconciliation is correspondingly smaller
