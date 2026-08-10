---
description: Statically audit UI against WCAG 2.1 AA and PRODUCT.md — status never colour-only, visible focus, keyboard order, ARIA, form labels, touch targets, dark-mode intent, reduced motion. Read-only.
argument-hint: '[path or surface — e.g. src/app/features/organization/ui or "the intervention board"]'
---

Delegate to the **fg-a11y-auditor** subagent: $ARGUMENTS

The agent carries the full smell catalog and the house rules; do not restate them. It is **read-only** and audits _intent_, statically — live contrast ratios and rendered dark-mode parity belong to **fg-e2e-runner**.

Require its report to give findings **worst-first**, each with `file:line`, the rule, a severity, and the concrete fix — plus an explicit "needs live confirmation" list naming specific elements and thresholds.
