---
description: Build or adjust a PrimeNG surface — table, dataview, form, dialog, drawer — with Tailwind v4 + [pt] only, dark-mode parity, and every prop looked up through the PrimeNG MCP.
argument-hint: '[component or surface] — e.g. "the member table row menu" or "a p-dataview for facilities"'
---

Delegate to the **fg-primeng-ui** subagent: $ARGUMENTS

Require it to:

1. **Look it up, do not guess.** Query the primeng MCP for the selector, props, events, and `[pt]` keys before writing markup — `search` → `get_component` → `get_example` → `validate_usage`. A binding PrimeNG silently ignores is the exact failure this agent exists to prevent.
2. Respect the **version skew**: the MCP serves PrimeNG 22, the project runs 21.1.9. `node_modules/primeng` on disk is authoritative for what exists here. Report any skew it hits.
3. Reach in order: **preset → Tailwind → `[pt]`**. The design tokens in `core/primeng/presets/` come before re-skinning at the call site; `[pt]` is for structural adjustments and for ARIA PrimeNG omits (§8.5).
4. Never edit `src/styles.css` (a hook blocks it). Tailwind classes must be **literal strings** — a computed class name produces no CSS at all.
5. Give every surface a `dark:` counterpart (`html[data-theme="dark"]`), and never convey status by colour alone.
6. Keep it presentational: a table, dataview, form, dialog, or drawer **never** injects a store or calls a data-access service. Resolve enum labels through the feature's `models/<concept>-tag/` registry, never a template `switch`.
7. Prove it with **computed styles**, not a screenshot — `javascript_tool(getComputedStyle(...))`, `resize_window(colorScheme: "dark")`, `resize_window(preset: "mobile")` — then a screenshot as final proof, then `preview_stop`.
