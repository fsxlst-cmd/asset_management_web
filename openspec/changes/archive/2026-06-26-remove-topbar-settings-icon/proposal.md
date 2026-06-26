## Why

The top app bar renders a settings (gear) icon on every screen, but it has no click handler and there is no `/settings` route for it to reach. It is a dead affordance — it promises an action the app cannot deliver, which is a small but real UX defect. Phase 1 (cash) has no settings surface planned, so the control has no near-term purpose.

## What Changes

- Remove the settings (gear) icon button from the top app bar so it no longer appears on any screen.
- Tidy the surrounding component: update the doc comment that mentions the "settings affordance" and adjust the header layout (the right-hand slot is now empty, making `justify-between` redundant) so the bar reads as a clean left-aligned row.
- No new settings destination is introduced; this is a removal only.

## Capabilities

### New Capabilities
- `app-shell`: Defines the persistent top app bar's structure and the rule that it only presents controls that lead somewhere — establishing the baseline so the removed gear icon is captured as intended behavior, not an undocumented gap.

### Modified Capabilities
<!-- None. No existing capability spec covers the top app bar. -->

## Impact

- `app/components/TopAppBar.vue` — removes the settings `<button>`/`<AppIcon>`, the doc comment reference, and the now-redundant `justify-between` layout class.
- Visually affects all 7 pages that mount `TopAppBar` (index, accounts, accounts/[id], budgets, budgets/[id], add, reconcile).
- No routes, APIs, server code, or dependencies are affected. No data model impact.
