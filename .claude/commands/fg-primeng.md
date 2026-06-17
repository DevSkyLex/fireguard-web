---
description: Look up authoritative PrimeNG component info (props, events, pt, tokens, examples) via the PrimeNG MCP
argument-hint: "<component or question, e.g. 'Table row selection' or 'theme tokens for Button'>"
---

Answer the PrimeNG question: **$ARGUMENTS**

Use the PrimeNG MCP tools (`mcp__primeng__*`) as the source of truth — do not
answer from memory:

- `search_components` / `suggest_component` to find the right component.
- `get_component_props`, `get_component_events`, `get_component_pt`,
  `get_component_tokens` for the exact API.
- `get_example` for a working usage sample.
- `get_accessibility_info` and `get_theming_guide` when relevant.

Then frame the answer for FireGuard: style via Tailwind + `[pt]`/tokens (never
`src/styles.css`), standalone + `OnPush`, dark-mode (`html[data-theme="dark"]`)
and WCAG 2.1 AA parity, orange accent reserved for primary/active state.
