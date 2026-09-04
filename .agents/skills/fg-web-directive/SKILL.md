---
name: fg-web-directive
description: 'Create or change a FireGuard Angular behavioral or typed template-marker directive with SSR-safe lifecycle handling.'
---

# fg-web-directive

Locate the repository from this skill: its root is three directories above this folder.
Read `AGENTS.md`, the applicable entries in `.codex/rules.md`, and the owning `FEATURE.md`
(including its parent for nested features). `ARCHITECTURE.md` remains normative.
Run commands from the repository root. Use the tools actually exposed by the Codex session;
see `.codex/workflow.md` for shell, MCP, delegation and validation conventions.

Read `.codex/references/naming.md` and architecture §8.5/§10.2. Place the directive with
the lowest owning concept, using `<name>.directive.ts`, its required public barrel and
`testing/`. Keep the `Directive` class suffix and an `app`-prefixed selector.

Behavioral DOM access must be browser-gated with explicit cleanup. Template markers expose
a typed context via `ngTemplateContextGuard`; place reusable context types in the owning
`models/`. Use a host-component test to prove attachment, events, cleanup or typed projection.
Check the current tree for exemplars; do not assume there are no existing directives.
Use `fg-web-test` for the host harness and report the chosen scope and SSR behavior.
