---
description: Scaffold a new FireGuard feature or subfeature following the canonical ARCHITECTURE.md templates
argument-hint: "<feature-name> [parent-feature for a nested subfeature]"
---

Scaffold the feature described by: **$ARGUMENTS**

Delegate the structural work to the `fg-feature-scaffolder` subagent. Before
generating anything:

1. Read `ARCHITECTURE.md` §7–§9 and the relevant `FEATURE.md` (parent + nested).
2. Mirror an existing sibling feature's real conventions.
3. Create only the folders/files this feature actually needs — no empty
   placeholders.
4. Add or update the `FEATURE.md` for any new top-level or business subfeature.

Then run `npm run format` and `npm run lint`, and list every file created.
