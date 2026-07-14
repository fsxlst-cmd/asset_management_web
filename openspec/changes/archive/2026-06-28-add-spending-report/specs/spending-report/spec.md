## ADDED Requirements

### Requirement: Monthly spending is aggregated by category for one calendar month

The system SHALL produce, for a single chosen calendar month, the total expense amount per category. Only entries of type `expense` are included; income and transfer entries MUST be excluded. Each category's total is the sum of the `amount` of its expense entries whose date falls within that month.

#### Scenario: Expenses are summed per category

- **WHEN** the user views the spending report for a month containing expenses tagged "Dining" (1,200,000 across several entries) and "Transport" (450,000)
- **THEN** the report shows Dining at 1,200,000 and Transport at 450,000

#### Scenario: Income and transfers are excluded

- **WHEN** the month contains income entries and transfers between the user's own accounts in addition to expenses
- **THEN** only the expense entries contribute to the report
- **AND** income and transfer amounts do not appear in any category total

#### Scenario: A month with no expenses

- **WHEN** the user views the report for a month with no expense entries
- **THEN** the report shows a total of zero and no category rows

### Requirement: Month boundaries are the WIB local calendar month

The month range SHALL be the half-open interval from the first day of the month at 00:00 WIB (Asia/Jakarta, UTC+7) up to, but not including, the first day of the following month at 00:00 WIB. This MUST use the same local-midnight boundary rule as budget accrual, so an expense is counted in the month the user experienced it locally, not the month it would fall in under UTC.

#### Scenario: A late-night expense stays in its local month

- **WHEN** an expense is logged late at night on the last day of June WIB (which is already past midnight UTC into July)
- **THEN** that expense is counted in June's report
- **AND** it is not counted in July's report

#### Scenario: An expense at the month boundary belongs to the new month

- **WHEN** an expense is dated exactly at 00:00 WIB on the first day of a month
- **THEN** it is counted in that new month
- **AND** it is not counted in the previous month

### Requirement: Categories are ranked by spend with a share of the month total

The report SHALL present categories ordered by their total spend, largest first, and SHALL include each category's share of the month's total expense (its amount divided by the month total). Category names MUST be resolved for display, including for categories that have since been archived.

#### Scenario: Rows are ordered largest first with shares

- **WHEN** a month has Dining 1,200,000, Groceries 880,000, and Transport 450,000 (total 2,530,000)
- **THEN** the rows are ordered Dining, Groceries, Transport
- **AND** each row shows its share of the total (Dining ≈ 47%, Groceries ≈ 35%, Transport ≈ 18%)

#### Scenario: An archived category still displays its name

- **WHEN** the month includes expenses tagged with a category that has since been archived
- **THEN** that category still appears as a row with its name
- **AND** its spend is included in the total

### Requirement: Each category shows a comparison to the previous month

For every category with spend in the chosen month, the report SHALL compute the change relative to that same category's total in the immediately preceding WIB calendar month, expressed as a percentage change. To avoid meaningless magnitudes on a near-zero base, when the previous month's total for the category is above zero but at or below a small fixed threshold, the change SHALL be expressed as an absolute amount instead of a percentage. A category with spend this month and none in the previous month SHALL be marked as new rather than shown as an infinite or percentage increase.

#### Scenario: Percentage change against a normal base

- **WHEN** a category spent 800,000 last month and 1,160,000 this month
- **THEN** the report shows an increase of about 45%

#### Scenario: Absolute change against a tiny base

- **WHEN** a category spent 5,000 last month and 200,000 this month
- **THEN** the report shows the change as an absolute amount (+195,000)
- **AND** it does not show a percentage such as "3900%"

#### Scenario: A category new this month is marked NEW

- **WHEN** a category has spend this month but had none in the previous month
- **THEN** the report marks it as new
- **AND** it does not show an infinite or percentage increase

#### Scenario: The month total is compared to the previous month

- **WHEN** the chosen month's total expense is 3,140,000 and the previous month's was 2,800,000
- **THEN** the report shows the month total with its change versus the previous month (about +12%)

### Requirement: Categories that went quiet are surfaced separately

The report SHALL list, separately from the ranked rows, any category that had expense in the previous month but has none in the chosen month, including the amount it spent last month. These quiet categories MUST NOT appear among the ranked rows for the chosen month.

#### Scenario: A stopped category appears in the quiet list

- **WHEN** a category had 320,000 of spend last month and none this month
- **THEN** it appears in the "quiet this month" list with its last-month amount of 320,000
- **AND** it does not appear as a ranked row for this month

### Requirement: Expenses with no resolvable category are not dropped

If an expense entry has a missing or unresolvable category, the report SHALL group it under a single synthetic "Uncategorised" bucket rather than discarding it or failing. This bucket is for display only and MUST NOT create or persist any category record.

#### Scenario: An uncategorised expense is bucketed, not lost

- **WHEN** the month contains an expense whose category cannot be resolved
- **THEN** its amount is included in the month total
- **AND** it appears under an "Uncategorised" row
- **AND** no category record is created as a result
