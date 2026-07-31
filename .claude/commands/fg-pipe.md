---
description: Create an Angular pipe at shared/<concept>/ui/pipes/<name>/ — the repo has zero pipes today, so this sets the precedent and must update ARCHITECTURE.md §9.2 in the same change.
argument-hint: '<name> — e.g. "duration-format"'
---

Delegate to the **fg-pipe-builder** subagent: $ARGUMENTS

Require it to:

1. **Challenge the premise first.** In a signals codebase a pipe is rarely right — a `computed()`, a `utils/` function, or an Angular built-in usually is. Apply the rule of three (§2.9): if it cannot name three real call sites across at least two features, it should recommend the alternative and **not** build the pipe. That is a valid, useful outcome.
2. If a pipe genuinely is right: emit `shared/<concept>/ui/pipes/<name>/` with `index.ts`, `<name>.pipe.ts`, `testing/`. Pure (never `pure: false`), no DI, no `standalone: true`, class keeps the `Pipe` suffix.
3. **Update `ARCHITECTURE.md` in the same change** (§14.3 — _"a deviation that is not recorded is a defect, not an exception"_):
   - §9.2 — move `.pipe.ts` into the live suffix table and drop the "currently unused" bullet,
   - §8.5 — remove the `# same shape, if a pipe is ever added` annotation,
   - §9.3 — state the pipe class-suffix rule, which is missing today,
   - `src/app/shared/README.md` if the pipe lands in a new concept.
4. Report **which sections it edited**. A pipe shipped without them is a defect by §14.3.
5. Run `npm run format && npm run lint && npx ng test --watch=false --include="src/app/shared/**/*.spec.ts" && npm run build`.
