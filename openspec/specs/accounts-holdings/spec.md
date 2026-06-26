# accounts-holdings

## Purpose

Defines the spine of the asset tracker: accounts as containers of value, an extensible asset catalog, holdings that record how much of an asset sits in an account, and net worth as the sum of holding values. Balances are derived from holdings (maintained by snapshot), never stored on the account.

## Requirements

### Requirement: Account represents a place where value is held

The system SHALL represent an account as a container identified independently of its balance. An account has a name, a kind (e.g. bank, e-wallet, physical cash, prepaid card), and an optional institution. An account's balance MUST NOT be stored on the account itself — it is derived from the holdings inside it.

#### Scenario: Creating an account

- **WHEN** the user creates an account with a name and a kind
- **THEN** the account is stored with no balance of its own
- **AND** it can immediately hold one or more holdings

#### Scenario: Account without an institution

- **WHEN** the user creates a physical-cash account (e.g. "Dompet")
- **THEN** the account is valid with no institution

### Requirement: Asset catalog defines what a holding is made of

The system SHALL maintain a catalog of asset types. In phase 1 the catalog contains cash. Each asset has a unit (e.g. IDR for cash, gram for gold) and a way to express value per unit. The catalog is extensible so future asset types are added without changing accounts or holdings.

#### Scenario: Cash is the seeded asset

- **WHEN** the system is initialized
- **THEN** a cash asset exists with a currency unit
- **AND** new asset types can be added later without modifying existing accounts or holdings

### Requirement: Holding records how much of one asset sits in one account

A holding SHALL link exactly one account to exactly one asset and store a quantity. An account may contain multiple holdings (one per asset). A holding's value is `quantity × unit value` of its asset; for cash the unit value is 1 in its own currency, so value equals quantity.

#### Scenario: Account holds cash

- **WHEN** a holding links an account to the cash asset with a quantity
- **THEN** the holding's value equals the quantity in the cash currency

#### Scenario: One account, multiple assets (future-proofing)

- **WHEN** a future asset type is added and a holding links it to an existing account
- **THEN** that account reports both holdings without any change to its definition

### Requirement: Net worth is the sum of holding values

Net worth at a point in time SHALL be the sum of the value of all holdings across all accounts, expressed in the base currency.

#### Scenario: Totalling net worth

- **WHEN** the user views net worth
- **THEN** the system sums the value of every holding across every account
- **AND** presents the total in the base currency

### Requirement: Holdings are maintained by snapshot

A cash holding's quantity SHALL be settable directly by the user (a snapshot of the real balance), not necessarily computed from transactions. The snapshot is the source of truth for net worth and is expected to be corrected during reconciliation.

#### Scenario: Updating a holding by snapshot

- **WHEN** the user enters the real current balance for a holding
- **THEN** the holding quantity is replaced with that value
- **AND** net worth reflects the new value immediately
