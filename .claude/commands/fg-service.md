---
description: Create a service — transport (extends HydraApiService), behavioral, access helper, or a pure data adapter — routed to the right kind and folder per ARCHITECTURE.md §10.6–§10.8.
argument-hint: '<concern> in <feature> — e.g. "audit-event in organization"'
---

Delegate to the **fg-service-builder** subagent: $ARGUMENTS

Require it to:

1. **Route to the right kind first** and say which — "service" names four different things here:
   - transport (HTTP to the business API) → `data-access/services/<concern>/`, **extends `HydraApiService`**,
   - persistence (IndexedDB, repositories, outbox) → `data-access/services/<concern>-offline/`,
   - behavioral (orchestration, device APIs, offline sync) → `services/<concern>/`,
   - access helper (permission projection) → `access/services/<concern>/`,
   - a pure normalization function → `data-access/adapters/<concern>.adapter.ts`, a **function**, not a class.
2. For a transport service, honour §11.3 without exception: never inject `HttpClient`, never build `HttpParams`/`HttpHeaders` outside the base class, return transport types only, and **never `catch` or `map`** — a `catchError` here breaks the `toStoreError` → `errorCallState` chain the store depends on.
3. Type collections as `HydraCollection<T>` with **unprefixed** keys (`member`, `totalItems`) — never reintroduce `hydra:` prefixes.
4. Match DTO enum literals to the backend **byte for byte** (`'in_progress'`, never `'inProgress'`) — TypeScript will not catch this.
5. Write the colocated `testing/` spec with `HttpTestingController` and `httpMock.verify()` in `afterEach`.
6. Export through `data-access/index.ts` — **stable service classes only**, never adapters or helpers.
7. Run `npm run format && npm run lint && npx ng test --watch=false --include="src/app/features/<feature>/**/*.spec.ts" && npm run build`.
