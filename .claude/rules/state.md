---
paths:
  - 'src/app/**/state/**/*.ts'
---

# NgRx SignalStore

- **`patchState` is the only mutation mechanism.** Direct state assignment is forbidden.
- Async goes through **`rxMethod` + `tapResponse`**. No `rxResource`, no `httpResource` — Angular marks `resource` experimental (§10.11).
- **Always `toStoreError(err)` before `errorCallState`.** Passing a raw `HttpErrorResponse` or `unknown` is a §16 anti-pattern; the normalizer is what preserves the RFC 7807 `status`/`title`/`detail`.
- No ad-hoc `isLoading: boolean` when a `CallState` covers the case.
- Composition order is fixed: `withEntities`/`withQueryState`/`withState` → `withComputed` → `withMethods` → **`withHooks` last**.
- `withQueryState` is for a store with **exactly one** primary query. Multi-action stores use named `<verb>CallState` fields.
- `withEntities` collections are named **singular**: `collection: 'member'` → `memberEntities()` (§9.6).
- A store must **not** both emit and listen to the same `eventGroup` instance — that is circular logic.
- Scope deliberately: `providers: [Store]` on the page for route-specific data that must reset. `{ providedIn: 'root' }` is not a default (§10.11).
- `state/index.ts` re-exports **only** the public slices — the `Store` const, its `StoreType`, the event group. Not every leaf store, not every helper (§13.3).
- `TransferState`: never bearer tokens, never secrets, never broad authenticated collections. Remove the key after the browser consumes it.

Templates and the decision tree: the `signalstore-recipes` skill.
