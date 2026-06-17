---
description: Create a FireGuard PrimeNG + Tailwind component (standalone, signals, OnPush) in the right layer
argument-hint: '<component description> [target feature/path]'
---

Build the component described by: **$ARGUMENTS**

Use the `fg-primeng-ui` subagent. Requirements:

- Standalone, signals (`input()`, `computed()`, `signal()`), `OnPush`.
- Style only with Tailwind utilities + PrimeNG `[pt]`/tokens — never `src/styles.css`.
- Decide placement by usage locality (component-local → feature → `shared`),
  per `ARCHITECTURE.md`. Presentational components are dumb (inputs/outputs);
  pages orchestrate stores/services.
- Dark mode parity (`html[data-theme="dark"]`), WCAG 2.1 AA, reduced-motion,
  and loading/empty/error/disabled states where relevant.
- Full JSDoc incl. `@author Valentin FORTIN <contact@valentin-fortin.pro>`.
- Confirm PrimeNG APIs via the PrimeNG MCP tools rather than guessing.

Finish with `npm run format`, `npm run lint`, `npm run build`.
