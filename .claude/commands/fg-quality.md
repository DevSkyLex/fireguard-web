---
description: Run the FireGuard quality gate (format, lint, targeted tests, build) and report results
argument-hint: "[optional test glob, e.g. src/app/features/auth/**]"
allowed-tools: Bash(npm run *), Bash(npx ng test:*), Bash(npx oxfmt:*), Bash(npx oxlint:*)
---

Run the FireGuard quality gate and report each step's result clearly.

Steps, narrowest first:

1. `npm run format` (oxfmt).
2. `npm run lint` (oxlint, `--tsconfig tsconfig.json`).
3. Tests — if `$ARGUMENTS` is provided, run `npx ng test --watch=false --include="$ARGUMENTS"`;
   otherwise run `npm run test:ci`. Never use bare `npx vitest`.
4. `npm run build` (validates strict Angular templates).

If a step fails, stop, show the failing output, and propose the fix — do not
silently continue. At the end, give a one-line PASS/FAIL summary per step.
