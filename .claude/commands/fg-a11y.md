---
description: Statically audit UI against WCAG 2.1 AA and PRODUCT.md — status never colour-only, visible focus, keyboard order, ARIA, form labels, touch targets, dark-mode intent, reduced motion. Read-only.
argument-hint: '[path or surface — e.g. src/app/features/organization/ui or "the intervention board"]'
---

Delegate to the **fg-a11y-auditor** subagent: $ARGUMENTS

Require it to check the templates and component styling for:

- **status conveyed by colour alone** — every severity colour needs a paired label or icon (`PRODUCT.md`),
- **visible focus** — `outline-none` without a `focus-visible:` replacement,
- **keyboard reachability** — `(click)` on a `<div>` or `<span>` instead of a real button; roving tabindex where a composite widget needs one,
- **ARIA** — missing roles and labels, icon-only buttons with no accessible name, and ARIA that duplicates or fights what the component already provides,
- **form labels** — every input associated with a label,
- **touch targets and thumb reach** — field agents work one-handed on a phone,
- **dark-mode intent** — light-only classes with no `dark:` counterpart,
- **reduced motion** — `transition-`/`animate-` with no `prefers-reduced-motion` guard.

It is **read-only** and audits _intent_, statically. Live contrast ratios and rendered dark-mode parity need a browser — it should hand those to **fg-e2e-runner** (`javascript_tool` with `getComputedStyle`, `resize_window` with `colorScheme: "dark"`) rather than guessing at pixels.

Ask for findings worst-first with the concrete fix, plus an explicit "needs live confirmation" list.
