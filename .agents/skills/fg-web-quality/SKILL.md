---
name: fg-web-quality
description: 'Run the scoped FireGuard quality checks: formatting, lint, Angular tests and strict build; report actual gates and failures.'
---

# fg-web-quality

Locate the repository from this skill: its root is three directories above this folder.
Read `AGENTS.md`, the applicable entries in `.codex/rules.md`, and the owning `FEATURE.md`
(including its parent for nested features). `ARCHITECTURE.md` remains normative.
Run commands from the repository root. Use the tools actually exposed by the Codex session;
see `.codex/workflow.md` for shell, MCP, delegation and validation conventions.

Read [test execution](../fg-web-test/references/testing.md) before selecting spec globs.
Use package.json for current scripts. Format only touched authored files using the local
oxfmt config; do not rewrite upstream skills or generated/dependency trees.

Run the narrowest useful validation first. For app changes: targeted lint and meaningful
tests, followed by strict `npm run build` when templates, runtime entry points or public
contracts changed. For broad integration use `npm run lint`, `npm run test:ci` and build.
For tooling-only changes, validate the actual scripts/configuration rather than rebuilding Angular.

Every `ng test --include` glob ends in `*.spec.ts`; use `npx ng test --watch=false`, never
bare Vitest. Browser tests belong to `fg-web-e2e`. Preserve visual artifacts before any runner
that cleans its output directory.

On a failure, diagnose it before continuing dependent gates. Fix in-scope defects and rerun
the failed check; report unrelated pre-existing failures without silently changing their files.
Do not claim skipped gates passed. Once the relevant risks are covered, stop optional testing.
Conclude with actual commands/results and any material remaining limitation.
