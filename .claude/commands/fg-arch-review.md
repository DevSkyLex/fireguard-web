---
description: Review frontend code against ARCHITECTURE.md — ownership, dependency direction, placement by usage locality, type-only models, ports, barrels, and FEATURE.md currency. Read-only.
argument-hint: '[path or diff scope — defaults to the working-tree changes]'
---

Delegate to the **fg-architecture-reviewer** subagent: $ARGUMENTS

If no scope is given, review the working-tree changes (`git status` + `git diff`).

Require it to check, per file:

- **Placement and ownership** — is it in the layer that owns the concern? Is business logic in a feature rather than pushed into `core`? Does the dependency direction hold (`core` never imports `features`; `shared` never imports feature state, services, or models — only a published port)?
- **Usage locality (§2.8)** — is each model, util, constant, and option at the **lowest** scope covering its consumers, and kept local until a second consumer forces it up? Nothing pre-hoisted "in case"?
- **Type-only `models/` (§10.10)** — runtime code out, apart from the two sanctioned exceptions (presentation registry, const-enum catalog).
- **Concern layout (§8.3)** — presentation only under `ui/`, guards/resolvers only under `http/`, no invented sibling folders, no empty buckets.
- **Barrels (§13.2/§13.3)** — explicit named re-exports, never `export *`; the narrowest public surface; no deep imports into another area's private files; a feature root barrel that does not mirror the internal tree.
- **`FEATURE.md` currency (§14.2)** — was it updated in the same change that moved a route, published or retired a public API, added a cross-feature dependency, or changed an invariant?

It is **read-only**: findings, not edits. It should defer store internals to **fg-signal-store**, markup to **fg-spartan-ui**, a11y to **fg-a11y-auditor**, backend↔frontend drift to the root **fg-contract-sync**, and browser proof to **fg-e2e-runner**.

Ask for findings ranked worst-first, each citing the section it violates, plus a clear conforms / changes-required verdict.
