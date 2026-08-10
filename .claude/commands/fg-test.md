---
description: Author or repair unit/integration specs at the boundary each unit owns — stores, data-access services, guards/resolvers, pages, presentational components — run via npx ng test, never bare vitest.
argument-hint: '<area or unit — e.g. "the interventions store" or src/app/features/auth>'
---

Delegate to the **fg-web-test-writer** subagent: $ARGUMENTS

The agent carries the boundary table (what each unit type owns), the standard harnesses, and the `--include` glob trap; do not restate them.

Require its report to state **which boundary each spec targets**, the files created or repaired (absolute paths, in colocated `testing/` folders), the exact `npx ng test --include` glob it ran with the **executed spec count** (a run of 0 specs also exits 0), and the format/lint/test results.
