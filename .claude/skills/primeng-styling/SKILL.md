---
name: primeng-styling
description: The FireGuard Web styling law — Tailwind v4 literal classes plus PrimeNG [pt], the preset-before-pt order, dark mode via html[data-theme=dark], and the §8.5 test for whether a shared wrapper earns its place at all. Also covers the PrimeNG MCP version skew. Use before writing any template or touching presentation.
---

# PrimeNG + Tailwind styling

Sources: `ARCHITECTURE.md` **§1.1**, **§8.5** · `CLAUDE.md` rule 3 · `PRODUCT.md`.

## The four hard rules

1. **Never edit `src/styles.css`.** A PreToolUse hook blocks it. Theme-wide changes go in the design-token preset under `src/app/core/primeng/presets/`.
2. **Tailwind classes must be literal strings.** Tailwind v4 scans `.ts` and `.html` for class names; a computed or concatenated class silently produces no CSS. `'bg-' + color` yields nothing. Write the full class in a ternary instead.
3. **Dark mode is `html[data-theme="dark"]`**, not `prefers-color-scheme`. `src/styles.css:23` declares `@custom-variant dark (&:where(html[data-theme="dark"], html[data-theme="dark"] *))`, so the `dark:` variant keys off the attribute. Every surface colour needs a `dark:` counterpart: `bg-red-500 dark:bg-red-400`.
4. **Status is never conveyed by colour alone.** Pair every severity colour with a label or icon (`PRODUCT.md`, WCAG 2.1 AA).

## Order of reach

**Preset → Tailwind → `[pt]`.** §8.5: _"Style through the design-token preset in `core/primeng/presets/` rather than re-skinning components with `[pt]` at every call site; reserve `[pt]` for structural adjustments and for ARIA that PrimeNG omits."_

If you find yourself passing the same `[pt]` object at three call sites, the answer is a preset token or a shared `[pt]` constant — `@shared/table-card-shell` exports `TABLE_CARD_SHELL_PT` + `TABLE_CARD_SHELL_STYLE_CLASS` for exactly this, and every entity table consumes it.

## Does a shared wrapper earn its place? (§8.5)

**Default answer: no.** _"A `shared` component that exists only so call sites avoid repeating PrimeNG markup does not earn its place: use the PrimeNG component directly at each call site and accept the duplication."_

A wrapper is justified by exactly three things:

| Justification                                                   | Example in this codebase                                                                 |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| a **capability gap** PrimeNG cannot express                     | `board` (per-drop validation predicate), `calendar` (scheduler), `toast` (stacking deck) |
| a **rendering shape** PrimeNG has no component for              | `empty-state`, `error-state`                                                             |
| an **accessibility pattern** PrimeNG gets wrong for the context | `nav-row` (must not be a `role="menu"`)                                                  |

If none applies, put the markup at the call site and say so.

## The PrimeNG MCP — look it up, do not guess

Eight tools: `list`, `search`, `get_component`, `get_guide`, `get_example`, `get_setup`, `validate_usage`, `version`.

Typical flow: `search` → `get_component` (selector, props, events, `[pt]` keys in one call) → `get_example` → `validate_usage` on the finished template. `get_guide` covers theming, passthrough, and the ARIA a component already provides — read it so you neither duplicate nor break it.

> **Version skew.** The MCP serves **PrimeNG 22**; this project runs **PrimeNG 21.1.9**. The MCP is authoritative for _usage semantics_; `node_modules/primeng` on disk is authoritative for _what exists here_. Grep the installed package before relying on an unfamiliar prop. The v21 line of the MCP server is not an option — it crashes on startup against the current MCP SDK.

## Component styling conventions

- **No `styleUrl` / `styles`.** Exactly one `.css` exists in `src/app` (`shared/toast`), and it is not precedent.
- `host: { class: 'block' }` for host-level layout — Tailwind only.
- `ChangeDetectionStrategy.OnPush` on every component (§1.1).
- Honour `prefers-reduced-motion` on any transition you add (`PRODUCT.md`).
- Touch targets and thumb reach matter — field agents work one-handed on a phone.

## Enum presentation is data, not a template branch

Never hard-code a label, colour, or icon for an enum value in a component. Resolve it through the owning feature's `models/<concept>-tag/` registry — `resolve<Concept>Tag(kind, value)` returns `{ label, severity, icon }` (§10.10). To add a value, edit the descriptor map; every consumer follows.

A `switch` on `InterventionStatus` in a template is the anti-pattern this registry exists to prevent.

## Proving it

Computed styles beat screenshots for colour and size — a screenshot cannot tell you a contrast ratio:

```
preview_start(name: "fireguard-web")
javascript_tool(getComputedStyle(el).backgroundColor)
resize_window(colorScheme: "dark")
resize_window(preset: "mobile")
computer({action: "screenshot"})     # visual proof, last
```

Design constraints to verify: body text ≥ 4.5:1, large/UI ≥ 3:1, visible focus, full dark-mode parity, keyboard navigable.
