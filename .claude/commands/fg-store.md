---
description: Create or refactor an NgRx SignalStore slice — CallState vs withQueryState vs withEntities, rxMethod + tapResponse, typed events, scoping, and the SSR handoff — per ARCHITECTURE.md §10.11.
argument-hint: '<slice> in <feature> — e.g. "audit-events in organization"'
---

Delegate to the **fg-signal-store** subagent: $ARGUMENTS

Require it to:

1. **Choose the shape and justify it** — named `<verb>CallState` fields for a multi-action store, `withQueryState` only when there is **exactly one** primary query, `withEntities` for an id-keyed collection with per-item updates, plain `CallState<T[]>` for a list always replaced wholesale.
2. Respect the composition order: `withEntities`/`withQueryState`/`withState` → `withComputed` → `withMethods` → **`withHooks` last**.
3. `patchState` as the **only** mutation mechanism; `rxMethod` + `tapResponse` for all async; **no `rxResource`/`httpResource`**.
4. **`toStoreError(err)` before `errorCallState`, always** — passing a raw error is a §16 anti-pattern, and the normalizer is what preserves RFC 7807 `status`/`title`/`detail`.
5. Use slice-first layout: `state/<slice>/` with a local `index.ts`, store file matching the folder name, support files in `models/` `events/` `utils/` `testing/`.
6. Decide root vs component scoping deliberately — `providers: [Store]` on the page for route-specific data that must reset. Scoping never changes ownership.
7. Emit typed events with `eventGroup` for consequences other layers must react to — and never have one store both emit and listen to the same group.
8. Re-export through `state/index.ts` **only** the slices that are genuinely public.
9. Run the targeted specs plus `npm run build`.
