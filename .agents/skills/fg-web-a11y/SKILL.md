---
name: fg-web-a11y
description: 'Perform a read-only accessibility review of FireGuard templates and interaction code, with actionable evidence and browser-check limits.'
---

# fg-web-a11y

Locate the repository from this skill: its root is three directories above this folder.
Read `AGENTS.md`, the applicable entries in `.codex/rules.md`, and the owning `FEATURE.md`
(including its parent for nested features). `ARCHITECTURE.md` remains normative.
Run commands from the repository root. Use the tools actually exposed by the Codex session;
see `.codex/workflow.md` for shell, MCP, delegation and validation conventions.

Review the requested scope against PRODUCT.md, native Spartan behavior and WCAG 2.1 AA.
Inspect labels/descriptions/errors, semantic roles and accessible names, focus visibility,
keyboard order, roving tabindex, overlay focus restoration, inert/hidden content, live
announcements, touch targets and reduced motion. Status must have a label/icon beyond color.

Trace conditional rendering and resize behavior that can remove the focused element.
Reuse existing primitive semantics rather than adding redundant ARIA. Static token review
cannot establish measured contrast or actual layout; identify the cases requiring
`fg-web-e2e` and report them as unverified until measured.

This is a read-only audit. Do not edit files or run a mutating formatter. Return concrete
findings with absolute file/line, user consequence, supporting evidence, severity and a
minimal correction. Report no findings when appropriate and name any limits. Do not expand
into unrelated surfaces or claim a full accessibility certification from static inspection.
