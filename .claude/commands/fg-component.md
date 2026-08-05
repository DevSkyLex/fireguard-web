---
description: Create an Angular component — presentational, page, p-table grid, p-dataview surface, form, dialog, or drawer — as a complete unit folder following ARCHITECTURE.md §10.2.
argument-hint: '<name> [where] — e.g. "usage-panel in organization" or "a shared empty-state variant"'
---

Delegate to the **fg-component-builder** subagent: $ARGUMENTS

Require it to:

1. **Decide placement first** and state the rule that drove it — `ui/pages/` (class ends `Page`, no barrel), `ui/tables/`, `ui/dataviews/`, `ui/forms/`, `ui/dialogs/`, `ui/drawers/`, `ui/components/`, or `shared/<concept>/ui/components/`. Before anything lands in `shared/`, apply the §8.5 test: a wrapper that only avoids repeating markup **does not earn its place**.
2. Emit the complete unit folder — `index.ts`, `.component.ts`, external `.component.html`, `testing/` — and **no optional bucket** nobody uses.
3. Honour the naming rules: **no `Component` suffix** on the class, selector `app-` + **folder** name, `OnPush`, explicit member types with `readonly`, past-tense outputs, `$localize` with explicit ids.
4. **Use spartan/ui before hand-rolling** — check `src/app/shared/ui`, then the catalog (`npx ng g @spartan-ng/cli:ui <name>`), then brain primitives. Look the API up through the **spartan MCP**.
5. Keep everything except a page free of stores and services.
6. Run `npm run format && npm run lint && npm run build` and report the results.

If the request is really about a rich spartan surface rather than creating the unit, hand it to **fg-spartan-ui** instead and say so.
