---
description: Create a pure helper as utils/<name>/<name>.utils.ts plus its testing/ spec — arbitrating first between utils/, constants/ and options/, then placing it at the lowest scope covering all consumers.
argument-hint: '<name> [scope] — e.g. "format-duration" or "map-facility for the organization feature"'
---

Delegate to the **fg-utils-builder** subagent: $ARGUMENTS

Require it to:

1. **Arbitrate the folder first** (§10.13) — a pure **function** → `utils/` (folder per unit + `testing/`); a fixed **value** → `constants/` (flat); a **UI choice list** → `options/` (flat); a `type`/`interface` → `models/`, not its job; anything needing DI → a service or store.
2. **Decide the scope** (§2.8) — one consumer means that component's local folder, not the feature level. Pre-hoisting "in case" is a §16 anti-pattern.
3. Apply the **rule of three** (§2.9). If it cannot point at a third real usage, it should say so and recommend inlining. **That is a valid outcome** — report it rather than treating it as a failure.
4. Grep for an existing helper first (`features/*/utils/`, `shared/`, `core/api/utils`, `core/request-state`). A near-duplicate is worse than the duplication it was asked to remove.
5. Emit `utils/<name>/<name>.utils.ts` + `testing/<name>.utils.spec.ts`, with **no barrel inside the unit folder** (§13.2) — `utils/index.ts` re-exports the implementation file directly.
6. Keep it pure: no `inject()`, no HTTP, no store, no side effects, no argument mutation. No `type`/`interface` declared in `utils/`.
7. Cover the edge cases in the spec — `null`, `undefined`, empty input, boundaries, the fallback branch.
8. Run `npm run format && npm run lint && npx ng test --watch=false --include="src/app/**/utils/**/*.spec.ts" && npm run build`.
