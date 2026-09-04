---
name: fg-web-util
description: 'Create or change pure FireGuard helpers, constants or option sets at the lowest scope covering their consumers.'
---

# fg-web-util

Locate the repository from this skill: its root is three directories above this folder.
Read `AGENTS.md`, the applicable entries in `.codex/rules.md`, and the owning `FEATURE.md`
(including its parent for nested features). `ARCHITECTURE.md` remains normative.
Run commands from the repository root. Use the tools actually exposed by the Codex session;
see `.codex/workflow.md` for shell, MCP, delegation and validation conventions.

Arbitrate first: function → `utils/<name>/<name>.utils.ts`; fixed value → `constants/`;
UI choice set → `options/`. Read `.codex/references/naming.md` and architecture §10.13.
Shared scope needs existing domain-agnostic consumers; a second consumer may justify lifting
an existing helper but not inventing a new abstraction.

Keep helpers pure: no injection, HTTP, stores, side effects or argument mutation. Reusable
types belong in the owner's models, not runtime helper folders. A util unit has no barrel;
the concern barrel exports directly from the implementation when needed.

Test meaningful input/output boundaries rather than constant declarations. Avoid tests for
reversible low-impact edits without behavioral risk. State the ownership decision and checks.
