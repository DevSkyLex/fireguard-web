---
name: fg-web-arch-review
description: 'Perform a read-only FireGuard frontend architecture review of ownership, imports, public APIs, state, SSR and FEATURE.md invariants.'
---

# fg-web-arch-review

Locate the repository from this skill: its root is three directories above this folder.
Read `AGENTS.md`, the applicable entries in `.codex/rules.md`, and the owning `FEATURE.md`
(including its parent for nested features). `ARCHITECTURE.md` remains normative.
Run commands from the repository root. Use the tools actually exposed by the Codex session;
see `.codex/workflow.md` for shell, MCP, delegation and validation conventions.

Read ARCHITECTURE.md and the touched features' parent/nested FEATURE.md before reviewing.
Trace actual dependencies and consumers. Check strongest-invariant ownership, placement by
usage locality, core/shared dependency direction, documented cross-feature imports, type-only
models, owner-published ports, public barrels and unit naming.

Check that pages orchestrate and presentational units emit; async state uses the correct
CallState/query/entities shape; route-critical loading and TransferState have one owner.
Review normative documentation when routes, public APIs, dependencies or invariants change.
Do not treat nearby legacy violations as precedents or rewrite untouched legacy areas.

This is read-only. Return actionable findings with absolute file/line, the violated rule,
concrete consequence and minimal fix. Distinguish verified findings from missing information;
state when none were found. No automatic edits, formatting or nested review processes.
