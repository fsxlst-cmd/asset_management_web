## Context

`app/components/TopAppBar.vue` is a sticky header mounted by all 7 pages. Its right-hand slot is a settings `<button aria-label="Settings">` wrapping `<AppIcon name="settings" />` (lines 22–24). The button has no `@click` handler and there is no `/settings` route, so it does nothing when tapped. This is a single, self-contained presentational component with no tests and no consumers depending on the button.

## Goals / Non-Goals

**Goals:**
- Remove the dead settings control from the top app bar across all screens.
- Leave the top bar visually clean (no empty slot, no stranded layout class).

**Non-Goals:**
- Building a settings screen or `/settings` route.
- Changing any other top bar behavior (title, back button, avatar).
- Touching the shared `AppIcon` component (the `settings` icon glyph may still be used elsewhere or in future).

## Decisions

- **Remove rather than disable/hide.** A hidden-but-present button still carries dead markup and intent. Outright removal is cleaner and matches YAGNI — re-add when an actual settings destination exists. Alternative considered: wiring it to a placeholder route — rejected as building scaffolding for unscoped phase-1 work.
- **Collapse the layout to a left-aligned row.** With the right slot gone, the header's `justify-between` has nothing to space against. Drop it (and the wrapping flex `<div>` becomes the sole child) so the avatar/back + title sit naturally at the left. Keep `items-center` and existing padding/spacing tokens untouched.
- **Leave `AppIcon` and the `settings` glyph alone.** The icon component is generic; only the TopAppBar usage is removed.

## Risks / Trade-offs

- [A future settings entry point will need to be re-added] → Low cost; it is ~3 lines. The proposal documents this is intentional removal, so re-adding is a deliberate future change, not a regression.
- [Layout shift on existing screens] → Minimal and desired: the title/avatar already sit at the left; only the now-empty right edge changes. Verify visually on home and a detail screen after the edit.
