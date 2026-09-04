---
name: fg-web-pipe
description: 'Create or change a pure FireGuard Angular pipe when a computed signal, built-in pipe or helper does not fit.'
---

# fg-web-pipe

Locate the repository from this skill: its root is three directories above this folder.
Read `AGENTS.md`, the applicable entries in `.codex/rules.md`, and the owning `FEATURE.md`
(including its parent for nested features). `ARCHITECTURE.md` remains normative.
Run commands from the repository root. Use the tools actually exposed by the Codex session;
see `.codex/workflow.md` for shell, MCP, delegation and validation conventions.

Check the current tree and architecture §9/§8.5 before choosing a pipe; historical claims
that the project has no pipes are not authoritative. Prefer a computed value for a single
component's derivation. A reusable pipe must earn its shared scope.

Use `shared/<concept>/ui/pipes/<name>/`, `<name>.pipe.ts`, `<Name>Pipe`, an app-prefixed pipe
name, required barrel and colocated `testing/`. Keep it pure and follow the architecture's
dependency restrictions. Cover actual transformation boundaries, including null/empty inputs.
Update normative docs only if the new contract changes their statements. Read
`.codex/references/naming.md` and use `fg-web-test` for test conventions.
