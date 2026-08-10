---
description: Create or refactor an NgRx SignalStore slice — CallState vs withQueryState vs withEntities, rxMethod + tapResponse, typed events, scoping, and the SSR handoff — per ARCHITECTURE.md §10.11.
argument-hint: '<slice> in <feature> — e.g. "audit-events in organization"'
---

Delegate to the **fg-signal-store** subagent: $ARGUMENTS

The agent carries the shape decision (named CallState fields vs `withQueryState` vs `withEntities`), the composition order, and the `toStoreError` rule; do not restate them. It stays strictly inside `state/` and hands specs to **fg-web-test-writer** — do not ask it to write or run specs.

Require its report to state the **shape it chose and why**, the scoping decision (root vs component), the events it emits, each named handoff, and the format/lint/build results.
