---
description: Create an Angular component — presentational, page, table grid, dataview surface, form, dialog, or sheet — as a complete unit folder following ARCHITECTURE.md §10.2.
argument-hint: '<name> [where] — e.g. "usage-panel in organization" or "a shared empty-state variant"'
---

Delegate to the **fg-component-builder** subagent: $ARGUMENTS

The agent carries the placement table, the naming rules, and the spartan-first markup rule; do not restate them.

Require its report to state the **placement decision and the rule that drove it**, the files created (absolute paths), every `$localize` id introduced, and the format/lint/test/build results.

If the request is really about a rich spartan surface rather than creating the unit, hand it to **fg-spartan-ui** instead and say so.
