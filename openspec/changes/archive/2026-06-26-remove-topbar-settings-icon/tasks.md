## 1. Remove the settings control

- [x] 1.1 In `app/components/TopAppBar.vue`, delete the settings `<button aria-label="Settings">` and its `<AppIcon name="settings" />` (lines ~22–24)
- [x] 1.2 Update the component doc comment (line ~2) to drop the "optional settings affordance" mention
- [x] 1.3 Remove the now-redundant `justify-between` from the `<header>` class so the bar reads as a left-aligned row; keep `items-center`, padding, and spacing tokens

## 2. Verify

- [x] 2.1 Run `npm run dev` and confirm the gear icon is gone on home (`/`) and a detail screen (e.g. an account), with title/avatar and back button laid out correctly
- [x] 2.2 Confirm no eslint/type errors introduced (`npm run lint` if available, or check the dev server output)
