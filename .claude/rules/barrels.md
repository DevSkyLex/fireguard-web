---
paths:
  - 'src/app/**/index.ts'
---

# Barrels

A barrel is a **public surface**, not a convenience re-export (§13.3).

- **Never `export * from`.** Explicit named re-exports only: `export { X } from './x'` and `export type { Y } from './y'`. A PreToolUse hook blocks the wildcard.
- Widening a barrel is a deliberate act. Export what outside code actually imports — nothing "in case".
- **Create one only when something outside actually imports the folder.** Five features in this codebase correctly have no root barrel at all; that is the right default, not an omission.
- The **feature root barrel** exposes only stable tokens meant for other features, layouts, or the app shell. It **must not mirror the internal folder tree** (§13.3). `features/organization/features/equipments/index.ts` is the model: a single line exporting one symbol.
- `data-access/index.ts` re-exports **stable service classes only** — never adapters, fixtures, or helpers.
- `state/index.ts` re-exports **only the public slices**: the `Store` const, its `StoreType`, the event group. Not every leaf store.
- **No barrel** in these folders (§13.2): `data-access/services/`, `data-access/adapters/`, `ui/pages/`, `utils/<name>/` unit folders, and nested `testing/` or helper folders local to one component.
- `shared` has **no root barrel and no aggregate kind barrel** — consumers import `@shared/calendar`, `@shared/empty-state` (§8.5).

When you retire a public API, record it in the owning `FEATURE.md` in the same change (§14.2).
