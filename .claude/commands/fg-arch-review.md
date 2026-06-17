---
description: Review the current changes against FireGuard's architecture documents
argument-hint: '[optional path or feature to focus on]'
allowed-tools: Bash(git diff:*), Bash(git status), Read, Grep, Glob
---

Review the current working changes for architecture conformance.

Scope: $ARGUMENTS (if empty, review the full `git diff`).

Delegate to the `fg-architecture-reviewer` subagent. It must check the diff
against `ARCHITECTURE.md`, `AGENTS.md` and the relevant `FEATURE.md`, covering
layering/ownership, folder taxonomy (`models/` type-only, slice-first state,
`http/` for guards/resolvers), import boundaries and aliases, SignalStore
patterns, `HydraApiService` usage, and code-quality rules (signals, `OnPush`,
strict TS, JSDoc, no `src/styles.css` edits).

Return a prioritized findings list (severity · `path:line` · violated rule with
document section · concrete fix) and a final **conforms / changes required**
verdict. Do not modify files.
