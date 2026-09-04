---
name: fg-web-component
description: 'Build an Angular component, page, form, table, dialog or sheet in FireGuard Web with correct ownership and native Spartan composition.'
---

# fg-web-component

Locate the repository from this skill: its root is three directories above this folder.
Read `AGENTS.md`, the applicable entries in `.codex/rules.md`, and the owning `FEATURE.md`
(including its parent for nested features). `ARCHITECTURE.md` remains normative.
Run commands from the repository root. Use the tools actually exposed by the Codex session;
see `.codex/workflow.md` for shell, MCP, delegation and validation conventions.

Decide placement before editing: route entry → `ui/pages/<name>-page/`; collection table →
`ui/tables/`; browsing surface → `ui/dataviews/`; form → `ui/forms/`; short overlay →
`ui/dialogs/`; contextual side panel → `ui/sheets/`; domain widget → `ui/components/`.
Generic UI belongs in `shared/<concept>/` only when its consumers and responsibility justify it.
Do not extract a wrapper merely to hide repeated Spartan markup.

Read `.codex/references/naming.md` for a new unit and the installed `fg-web-spartan` skill
before presentation work. Inspect one current sibling exemplar. Emit the unit's external
template, OnPush class and public barrel where the architecture requires it; pages have no barrel.
Use signal inputs/outputs, explicit types/access and Signal Forms. Pages orchestrate services,
stores and navigation; presentational units consume inputs and emit events.

Preserve existing public contracts unless the task needs a change; inspect consumers before
changing them. Add meaningful boundary coverage with `fg-web-test` when behavior changes.
For visual work, inspect desktop and mobile with `fg-web-e2e`; a build cannot prove layout.
Report placement, changed files, introduced translation IDs and actual verification results.
