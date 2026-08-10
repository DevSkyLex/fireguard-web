---
description: Create a service — transport (extends HydraApiService), behavioral, access helper, or a pure data adapter — routed to the right kind and folder per ARCHITECTURE.md §10.6–§10.8.
argument-hint: '<concern> in <feature> — e.g. "audit-event in organization"'
---

Delegate to the **fg-service-builder** subagent: $ARGUMENTS

The agent carries the kind-routing table (transport / persistence / behavioral / access / adapter) and the §11.3 transport contract; do not restate them.

Require its report to state **which kind it routed to and why**, the files created (absolute paths, including the colocated `testing/` spec), what it exported through `data-access/index.ts`, and the format/lint/test/build results.
