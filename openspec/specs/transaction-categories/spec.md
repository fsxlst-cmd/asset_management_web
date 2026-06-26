# transaction-categories

## Purpose

Defines user-managed category lists that classify income and expense entries: two kind-scoped lists (`income`, `expense`), soft-delete via archive/restore, and the validation rule that a category chosen for an entry must match the entry kind and be active. Categories are classification labels only and carry no budget, target, or accrual.

## Requirements

### Requirement: Categories are user-managed lists scoped by kind

The system SHALL let the user create, rename, and list categories. Each category has a name and a kind that is either `income` or `expense`. Income categories and expense categories form two separate lists; a category of one kind MUST NOT appear in the other kind's list. The system MUST NOT seed an opinionated default list of categories.

#### Scenario: Creating an expense category

- **WHEN** the user creates a category named "Dining" with kind `expense`
- **THEN** the category is stored with kind `expense`
- **AND** it appears in the expense category list
- **AND** it does not appear in the income category list

#### Scenario: Creating an income category

- **WHEN** the user creates a category named "Salary" with kind `income`
- **THEN** the category is stored with kind `income`
- **AND** it appears in the income category list

#### Scenario: Renaming a category

- **WHEN** the user renames an existing category
- **THEN** the new name is stored
- **AND** the kind is unchanged
- **AND** records already tagged with the category now show the new name

#### Scenario: Listing is scoped by kind

- **WHEN** the user requests categories for a given kind
- **THEN** only categories of that kind are returned

### Requirement: Categories are archived and restored, never destroyed

Deleting a category SHALL be a soft-delete: the category is archived rather than removed. An archived category MUST NOT appear in entry pickers or in the default category list, but it MUST remain readable on records already tagged with it. The user SHALL be able to restore an archived category, returning it to the active list. The system MUST NOT rewrite or re-tag existing records when a category is archived or restored.

#### Scenario: Archiving a category in use

- **WHEN** the user archives a category that has income or expenses tagged to it
- **THEN** the category is marked archived
- **AND** it no longer appears in entry pickers
- **AND** the existing tagged records still show that category

#### Scenario: Archived categories are hidden from pickers

- **WHEN** the user opens the category picker while logging income or an expense
- **THEN** archived categories are not offered as choices

#### Scenario: Viewing archived categories

- **WHEN** the user enables "show archived" on a category-management screen
- **THEN** archived categories of that kind are listed
- **AND** each offers a restore action

#### Scenario: Restoring an archived category

- **WHEN** the user restores an archived category
- **THEN** the category becomes active again
- **AND** it reappears in the entry pickers
- **AND** records previously tagged with it are unchanged

### Requirement: A category chosen for an entry must match the entry kind and be active

When a category is assigned to an income or expense entry, the system SHALL reject the entry unless the category exists, is not archived, and its kind matches the entry type (an income category for income, an expense category for an expense).

#### Scenario: Wrong-kind category is rejected

- **WHEN** the user tries to log an expense using an income-kind category
- **THEN** the entry is rejected
- **AND** no expense is stored

#### Scenario: Archived category is rejected for new entries

- **WHEN** the user tries to log an entry using an archived category
- **THEN** the entry is rejected
- **AND** no entry is stored

#### Scenario: Matching active category is accepted

- **WHEN** the user logs an expense using an active expense-kind category
- **THEN** the expense is stored with that category
