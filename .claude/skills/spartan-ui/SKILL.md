---
name: spartan-ui
description: The FireGuard Web interface law — spartan/ui (brain + helm) is the component library, Tailwind v4 utilities are the styling, and the catalog is checked before anything is hand-rolled. Covers where helm components live, how to add one with the CLI, the theme tokens, dark mode, and the vendored-code exceptions to ARCHITECTURE.md. Use before writing any template or touching presentation.
---

# spartan/ui

The app has **one** component library: [spartan/ui](https://spartan.ng). `@spartan-ng/brain` provides headless primitives (behaviour, a11y, CDK); the **helm** components are styled Angular components **copied into this repo** by the CLI — they are ours to edit, not a node_modules dependency.

## The rule that matters most

**Check the catalog before writing a component.** spartan ships 60 primitives. Re-creating a select, a dialog, a table, or a tooltip by hand is the single most expensive mistake available here — it costs the a11y work brain already did (focus trap, roving tabindex, aria wiring, typeahead) and it will drift from the theme.

Order of preference, always:

1. **A helm component already generated** in `src/app/shared/ui/` — import and use it.
2. **A helm component in the catalog but not yet generated** — run the CLI (below), then use it.
3. **A brain primitive with your own markup** — when the behaviour exists but the shape does not.
4. **Hand-rolled** — only when nothing above covers it. Say so, and say which of the three you ruled out.

Ask the **spartan MCP** (`.mcp.json`) for a component's API, props, and examples rather than guessing.

## Where components live

```text
src/app/shared/ui/<name>/
  src/index.ts            # the public entry — exported as @shared/ui/<name>
  src/lib/hlm-<name>.ts   # the component (yours to edit)
```

Import through the alias the CLI registers in `tsconfig.json`:

```ts
import { HlmButton } from '@shared/ui/button';
import { HlmCard, HlmCardHeader, HlmCardTitle } from '@shared/ui/card';
```

Never deep-import `.../src/lib/...` from outside the folder.

List what is already available:

```bash
ls src/app/shared/ui
```

## Adding a component

```bash
npx ng g @spartan-ng/cli:ui <name>
```

`components.json` at the repo root pins the answers (`componentsPath: src/app/shared/ui`, `importAlias: @shared/ui`, `style: nova`), so the generator runs without prompts, adds the `tsconfig` path, and pulls any primitive the component depends on. Commit what it writes.

## Styling

- **Tailwind v4 utilities in literal class strings.** Tailwind scans `.ts`/`.html`, so a computed class name silently produces no CSS.
- Compose classes with the `hlm` helper from `@shared/ui/utils` — it merges Tailwind classes so a caller's `class` input wins over the component default without specificity games.
- **Semantic tokens, not raw palette.** `bg-background`, `text-foreground`, `bg-primary`, `text-muted-foreground`, `border-border`, `ring-ring`, plus `text-success` / `text-warning` / `text-info` / `text-destructive` for status glyphs. These are the CSS custom properties in `src/styles.css`; using them is what makes dark mode and theming work at all.
- **Dark mode is `html[data-theme="dark"]`** — the attribute `ThemeService` writes, wired through `@custom-variant dark` and the `html[data-theme='dark']` token block. spartan's stock `:root.dark` was deliberately rewritten to it; do not reintroduce a second switch.
- Status is never conveyed by colour alone — pair severity with a label or icon (`PRODUCT.md`).

## The theme

`src/styles.css` owns the Tailwind layer order, the brain preset import, and the light/dark custom properties. It is **no longer off-limits**, but it takes theme tokens only — a component rule there is blocked by the guard hook, and rightly so: component styling belongs at the call site.

**The palette is spartan's `neutral` default, unmodified.** Do not tune a colour token
because a surface looks off — the whole point of an untouched default is that the next
`ng g @spartan-ng/cli:ui-theme` run is a no-op and every component reads the same ramp.
Branding the palette is a deliberate, separate decision that has not been taken.

One selector does differ from what the generator writes: the dark block is
`html[data-theme='dark']`, not `:root.dark`. Values are untouched — see above.

## Wiring

`provideSpartanHlm()` from `@shared/ui/utils` is registered in `app.config.ts`. It disables the CDK overlay `usePopover` behaviour introduced in Angular 21, which otherwise renders overlays above `position: fixed` elements. Do not remove it.

## Two sanctioned deviations from ARCHITECTURE.md

Helm components are **vendored code**, generated rather than authored, so two house rules do not apply inside `src/app/shared/ui/`:

- their barrels use `export *`, which §13.3 bans everywhere else;
- they do not follow §9's naming (`Hlm*` classes, `src/lib/` nesting, no `.component.ts` suffix).

Both are recorded in `ARCHITECTURE.md` §8.5. Re-generating a component must not be treated as a violation to "fix" — edit the component body freely, leave its shape alone.
