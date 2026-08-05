---
description: Build or adjust a spartan/ui surface — table, form, dialog, sheet, menu — with Tailwind v4 and the semantic theme tokens, checking the catalog before hand-rolling anything.
---

Delegate to the **fg-spartan-ui** agent.

Ask it to:

1. **Check the catalog first, and say which rung it landed on** — already generated (`ls src/app/shared/ui`), in the catalog (`npx ng g @spartan-ng/cli:ui <name>`), a brain primitive with custom markup, or hand-rolled as a last resort. Re-creating a component spartan already ships is the most expensive mistake available here: it throws away the a11y work brain already did.
2. Look up every component's inputs, outputs, and example through the **spartan MCP** rather than guessing; fall back to reading the generated component in `src/app/shared/ui/<name>/src/lib/`, which is authoritative for what exists here.
3. Style with Tailwind utilities in **literal class strings** and the semantic tokens (`bg-background`, `text-foreground`, `bg-primary`, `border-border`) — never raw palette values, never `src/styles.css`.
4. Respect the component rules: `OnPush`, external `templateUrl`, no `Component` suffix, `app-` + folder selector, past-tense outputs, `$localize` with dotted ids landing in `messages.fr.xlf` and `messages.es.xlf`, and **only a page may inject a store** (§10.3, §10.5).
5. Verify in the browser at both themes and 375px when the change is observable, then run `npm run format` → `lint` → targeted specs → `build`.

Helm components under `src/app/shared/ui/` are vendored: edit their body freely, leave their shape (the `export *` barrel, the `Hlm*` naming) alone — those are sanctioned deviations recorded in ARCHITECTURE.md §8.5.

$ARGUMENTS
