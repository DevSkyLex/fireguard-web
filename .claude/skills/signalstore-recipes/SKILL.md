---
name: signalstore-recipes
description: NgRx SignalStore decision tree and code templates for FireGuard Web — named CallState fields vs withQueryState vs withEntities, the rxMethod + tapResponse + toStoreError shape, composition order, typed events, root vs component scoping, and the TransferState handoff. Use when creating or changing anything under state/.
---

# SignalStore recipes

`ARCHITECTURE.md` **§10.11** is the complete store standard; **§9.6** governs naming. This skill is the decision tree and the templates.

## Choose the shape first

| The store…                                              | Use                            | Why                                |
| ------------------------------------------------------- | ------------------------------ | ---------------------------------- |
| has **several** async actions (CRUD, multi-command)     | named `<verb>CallState` fields | each call reports independently    |
| has **exactly one** primary query                       | `withQueryState<T>()`          | one status, one error, one payload |
| holds a list keyed by `id`, with per-item update/delete | `withEntities`                 | O(1) lookup, no manual array       |
| holds a list always replaced wholesale                  | `CallState<T[]>`               | `withEntities` buys nothing here   |

Getting this wrong is the common failure: `withQueryState` on a multi-action store forces every call through one status field.

## Import surface

```ts
import {
  idleCallState,
  pendingCallState,
  successCallState,
  errorCallState,
  toStoreError,
  toStoreFailureEventPayload,
  isCallPending,
  isCallSuccess,
  isCallError,
  type CallState,
  type StoreError,
  type StoreFailureEventPayload,
} from '@core/request-state';
```

The retired `Operation<TData, TError>` / `create*Operation` API must not appear in new code.

## Composition order — fixed

`withEntities` / `withQueryState` / `withState` → `withComputed` → `withMethods` → **`withHooks` last**. Services are injected as default parameter values of `withMethods`.

## Template — multi-action store

```ts
interface FeatureState {
  listCallState: CallState<FeatureOutput[]>;
  createCallState: CallState<FeatureOutput>;
}

const INITIAL_STATE: FeatureState = {
  listCallState: idleCallState(),
  createCallState: idleCallState(),
};

export const FeatureStore = signalStore(
  withState<FeatureState>(INITIAL_STATE),

  withComputed((store) => ({
    isLoading: computed(() => isCallPending(store.listCallState())),
    items: computed(() => {
      const state = store.listCallState();
      return isCallSuccess(state) ? state.data : [];
    }),
  })),

  withMethods((store, service = inject(FeatureService), dispatcher = inject(Dispatcher)) => ({
    load: rxMethod<RequestOptions>(
      pipe(
        tap(() =>
          patchState(store, {
            listCallState: pendingCallState(store.listCallState().data ?? []),
          }),
        ),
        switchMap((options) =>
          service.list(options).pipe(
            tapResponse({
              next: (res) => patchState(store, { listCallState: successCallState(res.member) }),
              error: (err: unknown) =>
                patchState(store, {
                  listCallState: errorCallState(
                    toStoreError(err),
                    store.listCallState().data ?? [],
                  ),
                }),
            }),
          ),
        ),
      ),
    ),
  })),

  withHooks((store) => ({
    onInit(): void {
      store.load({});
    },
  })),
);
```

**`toStoreError(err)` before `errorCallState` — always.** Passing a raw `HttpErrorResponse` or `unknown` is a §16 anti-pattern; the normalizer is what detects RFC 7807 `ApiError` and `ConstraintViolation` and preserves `status`/`title`/`detail`.

Note `pendingCallState(previous)` and `errorCallState(error, previous)` carry the previous data — that is how a list stays on screen while refreshing instead of flashing empty.

## Template — single-query store

```ts
export const TrendStore = signalStore(
  withQueryState<TrendResource>(),
  withState<TrendFilterState>(INITIAL_FILTER_STATE),
  withComputed((store) => ({
    /* … */
  })),
  withMethods((store, service = inject(FeatureService)) => ({
    load: rxMethod<Params | undefined>(
      pipe(
        switchMap((params) => {
          if (!params) return EMPTY;
          patchState(store, setPendingQuery());
          return service.get(params).pipe(
            tapResponse({
              next: (data) => patchState(store, setSuccessQuery(data)),
              error: (err) => patchState(store, setErrorQuery(toStoreError(err))),
            }),
          );
        }),
      ),
    ),
  })),
);
```

`withQueryState` exposes `isQueryLoading`, `isQueryLoaded`, `queryData`, `queryError` over private `_query*` state.

## withEntities

```ts
withEntities({ entity: type<EntityOutput>(), collection: 'entity' }),
```

Collection name is **singular** (§9.6) and generates `entityEntities`, `entityEntityMap`, `entityIds`. Update with `setAllEntities`, `addEntity`, `updateEntity`, `removeEntity`.

## Typed events

```ts
export const authStoreEvents = eventGroup({
  source: 'Auth Store', // Title Case human name of the store
  events: {
    loginFailed: type<StoreFailureEventPayload>(),
    logoutSucceeded: type<void>(),
  },
});
```

Dispatch with `inject(Dispatcher)`; listen with `inject(EventDispatcher)` / `Events` in a service, page, or another store's `withHooks`.

**A store must not both emit and listen to the same event group instance** — that is circular logic.

Emit an event when: an action failed and another layer must react (redirect, clear, toast); an action succeeded and a sibling store must invalidate; a page must react without polling.

## Root vs component scoping

| Situation                                                                              | Scope                                                   |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| must persist across navigation, used by unrelated features, session-tied and expensive | root-provided                                           |
| route-specific and must reset, used only in one route subtree                          | **component-scoped** — `providers: [Store]` on the page |

_"Do not use `{ providedIn: 'root' }` as a default for every store. Scoped stores are lower-risk."_ Scoping never changes ownership (§2.6).

## TransferState handoff

Four preconditions, all required (§10.11, §12.5): the data is needed for the initial SSR HTML · the browser would refetch it immediately · the payload is small · ownership is obvious at one store or route boundary.

1. SSR: fetch → `transferState.set(KEY, result)` → apply to store.
2. Browser with key: read → apply → **remove the key**.
3. Browser without key: fetch normally.

Never serialize bearer tokens, secrets, or broad authenticated collections. `TransferState` is a targeted handoff, not a cache.

> Put the handoff in the method both server and browser actually call. A guard calling `ensureLoaded()` on both sides works; an `initialize()` that returns early when the store is already filled never writes the key on the server — the browser then refetches on hydration, which is the exact bug it was meant to prevent.

## Slice layout (§10.11)

```text
state/
  index.ts                    # re-exports ONLY the public slices
  <slice>/
    index.ts                  # every slice has a local barrel
    <slice>.store.ts          # file name matches the folder
    models/state.interface.ts # single-store slice: short names
    events/events.ts
    utils/ features/ testing/ # optional
```

A **multi-store** slice names its support files after their store (`events/trusted-device.events.ts`). An **aggregate** slice adds `slices/<metric>/` and `features/<name>.feature.ts`.

`state/index.ts` re-exports only the public slices — typically the `Store` const, its `StoreType`, and the event group. Not every leaf store, not every helper (§13.3).

## Non-negotiables

- `patchState` is the **only** mutation mechanism.
- `rxMethod` + `tapResponse` (from `@ngrx/operators`) for all async — **no `rxResource` / `httpResource`** as the store standard; Angular marks `resource` experimental.
- No ad-hoc `isLoading: boolean` when a `CallState` covers it (§16).
- Store location follows **business ownership**, not provider scope (§2.6). Only `core/request-state` lives outside feature state.
