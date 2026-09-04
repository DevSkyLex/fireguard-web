---
name: fg-web-spartan
description: 'Build or refine FireGuard interfaces using installed Spartan Nova primitives, neutral semantic tokens and native interaction patterns.'
---

# fg-web-spartan

Locate the repository from this skill: its root is three directories above this folder.
Read `AGENTS.md`, the applicable entries in `.codex/rules.md`, and the owning `FEATURE.md`
(including its parent for nested features). `ARCHITECTURE.md` remains normative.
Run commands from the repository root. Use the tools actually exposed by the Codex session;
see `.codex/workflow.md` for shell, MCP, delegation and validation conventions.

Read the official `spartan` skill at `../spartan/SKILL.md` and only its rule files relevant to
the current task. Its library procedures complement this FireGuard-specific skill; this skill's
architecture, design, SSR, Signal Forms and validation requirements remain authoritative.

Read `DESIGN.md`, `PRODUCT.md` and [the native UI conventions](references/ui-conventions.md).
Inspect the installed primitive in `src/app/shared/ui/` first. Check the available Spartan
MCP catalog/blocks/docs for a missing primitive or uncertain API; if unavailable, use local
sources and official documentation and state the fallback. Never invent MCP tool names.

Prefer an installed helm primitive, then an official missing primitive installed with the
project CLI, then brain composition only for a real gap. Do not create a parallel design
system or a generic wrapper around an existing select, card, button or overlay.

Keep official neutral/Nova defaults, Geist, semantic tokens and `html[data-theme="dark"]`.
Compose field groups, native cards/items, tabs, menus and sheets according to their intended
purpose. Keep one clear commitment per active surface, useful density, visible focus,
local errors and task context across navigation. Preserve permissions, SSR and offline behavior.

When design judgment is open, the separately installed `impeccable` or `ui-ux-pro-max` skill
can advise. Read `.codex/third-party-skills.md`; their broad suggestions do not replace the
user's Spartan constraint. Do not generate another design-system tree or replace the palette.

Use `fg-web-e2e` for actual desktop/mobile and light/dark inspection when presentation changes.
Use `fg-web-a11y` for relevant keyboard/semantics review. Report primitives used, concrete
behavioral/visual changes and evidence; no automatic external reviews or new dependencies.
