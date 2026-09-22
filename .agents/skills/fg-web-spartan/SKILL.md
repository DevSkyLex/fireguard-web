---
name: fg-web-spartan
description: 'Build or refine FireGuard Angular pages, components, Signal Forms, collections and overlays using native Spartan; review visual composition within the project design contract.'
---

# FireGuard native UI

Resolve the repository from this skill (three parent directories). Follow
[AGENTS.md](../../../AGENTS.md), the [workflow](../../../.codex/workflow.md), matching rules
and the owner/parent FEATURE.md. Read DESIGN.md and PRODUCT.md for the affected surface.

Read the official [spartan skill](../spartan/SKILL.md) and only its relevant rule files.
Inspect installed `src/app/shared/ui/` APIs before composition; these primitives are read-only.
Prefer installed Helm, then an official missing primitive, then Brain composition for a real gap.
Use available MCP documentation when useful; never invent tool names or a second design system.

## Choose the relevant reference

- Creating or restructuring a page/component: [components](references/components.md).
- Native primitives, theme and imports: [UI conventions](references/ui-conventions.md).
- Signal Forms or reusable validators: [forms](references/forms.md).
- Entity tables or card/list browsing: [collections](references/collections.md).
- Choosing or changing a temporary surface: [overlays](references/overlays.md).
- One control with desktop/mobile presentations: [adaptive composition](references/adaptive-composition.md).
- Requested visual critique: [design review](references/design-review.md), which is read-only.

Do not load every reference for a small edit. Pages orchestrate; presentational units consume
inputs and emit outputs. Keep Signal Forms, semantic tokens, native behavior, SSR, permissions
and the existing public contracts. Inspect actual consumers before changing a contract.

For design judgment within its declared scope, use official `design-taste-frontend` after
reading [third-party constraints](../../../.codex/third-party-skills.md). It excludes dashboards,
data tables and multi-step product UI; FireGuard's own design review handles those surfaces.

Use `fg-web-test` for meaningful behavior boundaries, `fg-web-e2e` for required browser evidence
and `fg-web-quality` for scoped gates. Distinguish implementation, design critique, accessibility
audit and browser execution. Report placement, primitives, behavior/visual changes and real checks.
