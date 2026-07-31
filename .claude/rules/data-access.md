---
paths:
  - 'src/app/**/data-access/**/*.ts'
---

# Data access

- **Every feature API service extends `HydraApiService`** from `@core/api`. Never inject `HttpClient` (§11.3, §16).
- Never build `HttpParams` or `HttpHeaders` outside the base class — extend its protected helpers (`buildUrl`, `buildParams`, `buildHeaders`).
- A service returns `Observable<T>` of **transport types only**. It **never subscribes, never `catch`es, never `map`s to a view model** — a `catchError` here breaks the `toStoreError` → `errorCallState` chain the store depends on (§11.6).
- Collections are `HydraCollection<T>` = `{ member, totalItems, view? }` — **unprefixed** API Platform 4 keys. Never reintroduce `hydra:member` (§11.7).
- DTOs are `…-input.interface.ts` / `…-output.interface.ts`; output DTOs representing a backend resource `extends HydraItem`. The `.dto.ts` suffix is banned (§9.2).
- **Enum literals match the backend byte for byte**: `'in_progress'`, never `'inProgress'`. TypeScript will not catch a mismatch (§9.8).
- Adapters in `data-access/adapters/` are **pure functions**, never classes: no `inject()`, no side effects (§10.6).
- `data-access/index.ts` re-exports **stable service classes only** — never adapters, fixtures, or helpers (§13.3).
- `data-access/services/` and `data-access/adapters/` are private. Outside code imports `@features/<f>/data-access` (§13.4).

> API Platform omits null fields: an optional field arrives as `undefined`, not `null`. A `=== null` guard lets it through.

The full contract: the `hydra-data-access` skill.
