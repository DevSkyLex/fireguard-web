---
name: fg-web-test
description: 'Write or repair FireGuard Angular unit/integration tests at the owning boundary and run them through ng test.'
---

# fg-web-test

Locate the repository from this skill: its root is three directories above this folder.
Read `AGENTS.md`, the applicable entries in `.codex/rules.md`, and the owning `FEATURE.md`
(including its parent for nested features). `ARCHITECTURE.md` remains normative.
Run commands from the repository root. Use the tools actually exposed by the Codex session;
see `.codex/workflow.md` for shell, MCP, delegation and validation conventions.

Read [the testing harnesses](references/testing.md), architecture §14.1 and one sibling
spec. Select the boundary: store state transitions, service wire contract, guard/resolver
routing, page orchestration, or presentational inputs/outputs. Reuse existing typed fixtures.

Keep specs in the subject's `testing/` folder. A directive needs a host component; a
transport service needs HttpTestingController and verification of outstanding requests.
Do not inject feature stores into a presentational test or mirror implementation details.
Add a regression that fails on the reported behavior before fixing it when practical.

Run `npx ng test --watch=false --include="<area>/**/*.spec.ts"`; the include argument is
test discovery and must end in `*.spec.ts`. Never invoke bare Vitest. Visual, browser focus,
responsive and navigation evidence belongs to `fg-web-e2e`. Do not change production behavior
merely to satisfy an incorrect test. Report what the tests prove and the actual results.
