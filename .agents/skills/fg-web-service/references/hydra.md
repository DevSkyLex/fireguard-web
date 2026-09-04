# Hydra data access

`ARCHITECTURE.md` **§10.6** (structure), **§11.3** (contract), **§11.7** (envelope). This skill is the operational summary.

## The contract

```ts
@Service()
export class OrganizationMemberService extends HydraApiService {
  public list(
    organizationId: string,
    options?: RequestOptions,
  ): Observable<HydraCollection<OrganizationMemberOutput>> { … }
}
```

`HydraApiService` (`@core/api`) is `abstract` and its transport methods are `protected`. Subclasses expose intent-revealing public methods on top. The decorator is **`@Service()`**, never `@Injectable` and never with `providedIn` (§10.14); the abstract base itself carries `@Service({ autoProvided: false })`, since an abstract class is never provided.

`getCollection<T>()` → `Observable<HydraCollection<T>>` · `getOne<T>()` · `post<TInput, TOutput>()` · `put` · `patch` · `delete()` · plus `buildUrl(path, id?)`, `buildParams(options?)`, `buildHeaders()` for lower-level assembly. It sets `withCredentials: true` and `Content-Type: application/ld+json` automatically.

## What a transport service must not do

| Never                                       | Because                                                                                                 |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| inject `HttpClient`                         | that is the base class's job (§16)                                                                      |
| build `HttpParams` / `HttpHeaders` yourself | extend the base class's protected helpers instead                                                       |
| `catchError`                                | **it breaks the error chain** — the store's `tapResponse` must see the raw error to call `toStoreError` |
| `map` to a view model                       | services return transport types; derivation belongs to the store, an adapter, or a `computed`           |
| `subscribe`                                 | the store subscribes, via `rxMethod`                                                                    |
| carry client-derived state on a DTO         | API contracts are `readonly` mirrors of the wire format                                                 |

## The envelope (§11.7)

```ts
interface HydraCollection<T> {
  readonly member: T[];
  readonly totalItems: number;
  readonly view?: HydraView;
}
```

**Unprefixed keys.** API Platform 4 dropped the `hydra:` prefix — never reintroduce `hydra:member` or `hydra:totalItems`. Pagination reads `view` and `totalItems` from the response.

## DTOs (§9.8)

- `…Input` = what the frontend **sends**; `…Output` = what the backend **returns**.
- Output DTOs representing a backend resource `extends HydraItem`.
- The `.dto.ts` suffix is **banned** — use `<name>-input.interface.ts` / `<name>-output.interface.ts`.
- Domain enums are string-literal unions in `.type.ts`, with values matching the backend **byte for byte**: `'in_progress'`, never `'inProgress'`. This is the highest-signal contract defect there is, and TypeScript will not catch it.
- DTOs live in the feature's `models/<concept>/`, alongside the output interface that uses them.

> **API Platform omits null fields.** An optional field that is null server-side arrives as `undefined`, not `null`. A `=== null` guard lets it through — use a falsy check or `== null`.

## The error flow — do not short-circuit it (§11.6)

```text
HttpErrorResponse
  → interceptors (401 → redirect)
  → service Observable propagates it UNTOUCHED
  → store rxMethod catches in tapResponse.error
  → toStoreError(err) normalizes to StoreError
  → patchState(store, { xCallState: errorCallState(storeError, previous) })
  → page computed: isCallError(store.xCallState())
  → page decides the UI reaction
```

No layer skips a step. A page must never read a raw `HttpErrorResponse` from a service.

Narrow errors with the guards before reading fields: `isApiError(error)` for RFC 7807 problem details, `isConstraintViolation(error)` for field-level 400s. Both live in `@core/api/utils` — one of only two sanctioned deep imports under `core` (the other is `@core/api/models`).

## Data adapters — pure functions, not classes (§10.6)

```ts
export function getDashboardTrendPointValue(point: TrendSeriesPoint): number {
  return Number(point['count'] ?? point['total'] ?? point['value'] ?? 0);
}
```

**Use one when** the API returns a generic `Record<string, unknown>` needing dynamic key probing, or the same normalization is duplicated across two or more stores or components.

**Do not** for a single field rename, or for derivation that belongs in a `computed`.

No `inject()`, no side effects, no class. Scattering `point['count'] ?? point['total'] ?? 0` across several stores is precisely the §16 anti-pattern the adapter prevents.

## Barrels (§13.3)

```ts
// data-access/index.ts — stable service classes ONLY
export { OrganizationMemberService } from './services/organization-member/organization-member.service';
```

`data-access/services/` and `data-access/adapters/` are **private**. Another feature importing either is a §13.4 violation — outside code imports `@features/<f>/data-access`. If two unrelated features need the same pure transformation, it belongs in its own `shared/<concept>/`.

## Exemplars

- service + spec: `src/app/features/organization/data-access/services/organization-member/`
- base class: `src/app/core/api/services/hydra-api/hydra-api.service.ts`
- pure adapter: `src/app/features/organization/data-access/adapters/organization-dashboard-trend.adapter.ts`
