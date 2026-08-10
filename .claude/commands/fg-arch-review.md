---
description: Review frontend code against ARCHITECTURE.md — ownership, dependency direction, placement by usage locality, type-only models, ports, barrels, and FEATURE.md currency. Read-only.
argument-hint: '[path or diff scope — defaults to the working-tree changes]'
---

Delegate to the **fg-architecture-reviewer** subagent: $ARGUMENTS

If no scope is given, review the working-tree changes (`git status` + `git diff`).

The agent carries the review checklist; do not restate it. It is **read-only**: findings, not edits. It defers store internals to **fg-signal-store**, markup to **fg-spartan-ui**, a11y to **fg-a11y-auditor**, backend↔frontend drift to `/fg-contract-check` run from the monorepo root, and browser proof to **fg-e2e-runner**.

Require its report to rank findings worst-first, each citing the `ARCHITECTURE.md` section it violates, and to close with a clear conforms / changes-required verdict.
