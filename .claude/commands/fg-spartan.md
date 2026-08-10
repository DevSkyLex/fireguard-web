---
description: Build or adjust a spartan/ui surface — table, form, dialog, sheet, menu — with Tailwind v4 and the semantic theme tokens, checking the catalog before hand-rolling anything.
argument-hint: '<surface or change — e.g. "a filters sheet on the interventions page" or "dark-mode parity on the member table">'
---

Delegate to the **fg-spartan-ui** subagent: $ARGUMENTS

The agent carries the catalog-first ladder, the token rules, and the vendored-helm exceptions (it loads the `spartan-ui` skill); do not restate them.

Require its report to state **which rung of the catalog ladder it landed on** (generated / CLI-added / brain primitive / hand-rolled and why), the files touched, browser verification at both themes and 375px when the change is observable, and the format/lint/test/build results.
