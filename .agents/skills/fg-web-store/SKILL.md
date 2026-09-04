---
name: fg-web-store
description: 'Create or refactor FireGuard NgRx SignalStore state with explicit request states, typed events, intentional scope and SSR handoffs.'
---

# fg-web-store

Locate the repository from this skill: its root is three directories above this folder.
Read `AGENTS.md`, the applicable entries in `.codex/rules.md`, and the owning `FEATURE.md`
(including its parent for nested features). `ARCHITECTURE.md` remains normative.
Run commands from the repository root. Use the tools actually exposed by the Codex session;
see `.codex/workflow.md` for shell, MCP, delegation and validation conventions.

Read [the store recipes](references/signalstore.md), architecture §10.11 and a current
sibling store/spec. Choose named CallState fields for independent actions, withQueryState
for a single primary query, and withEntities when collection operations justify it.

Use patchState, rxMethod, tapResponse and toStoreError. Keep previous data when refreshing
or reporting a recoverable failure. Choose switch/exhaust/concat behavior from command
semantics; never cancel an already-accepted write merely to make the UI feel responsive.
Use typed eventGroup events for cross-layer navigation, toasts and invalidation consequences.

Keep store support types/events in its slice. Provider scope does not change business
ownership. Use a targeted TransferState handoff only for small route-critical data, consume
and remove it after hydration, and avoid duplicate fetches.

Test state transitions with a mocked service, including errors/retry/races introduced by the
change. HTTP mapping belongs to transport tests. Document changed public events or invariants.
