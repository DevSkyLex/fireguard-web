---
description: Run the FireGuard Web quality gate — oxfmt, oxlint, targeted or full tests, and the strict Angular build — stopping at the first failure.
argument-hint: '[optional spec glob, e.g. src/app/features/organization/** — normalized to end in *.spec.ts]'
allowed-tools: Bash(npm run *), Bash(npx ng test *)
---

Run the quality gate, **narrowest first**, and report each step.

1. `npm run format` — oxfmt.
2. `npm run lint` — oxlint (`--tsconfig tsconfig.json`).
3. **Tests.** If `$ARGUMENTS` is given, run `npx ng test --watch=false --include="<glob>"`; otherwise `npm run test:ci`.

   **Normalize `$ARGUMENTS` so the glob ends in `*.spec.ts`** — turn `src/app/shared/**` into `src/app/shared/**/*.spec.ts`, and `src/app/features/organization` into `src/app/features/organization/**/*.spec.ts`. `--include` is the **spec-discovery glob**, not a path filter: a directory glob makes the runner load every `.html` and `.component.ts` as a test entry and fails with `No loader is configured for ".html" files`.

   Never use bare `npx vitest` — it misses the project globals and dies with `describe is not defined`.

4. `npm run build` — validates strict Angular templates, and catches what the test program cannot (`tsconfig.spec.json` includes only `*.d.ts` and `*.spec.ts`, so `src/server.ts` and friends are never in it).

`npm run quality` runs format:check + lint + test:ci + build in one shot when you want the whole gate.

If a step fails, **stop**, show the real output, and propose the fix — do not continue to the next step. End with a one-line PASS/FAIL per step.
