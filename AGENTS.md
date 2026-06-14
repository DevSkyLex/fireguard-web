# Codex Instructions

These instructions are mandatory for AI agents working in this repository.

## First Read

- Treat [ARCHITECTURE.md](ARCHITECTURE.md) as the normative source for frontend architecture.
- Before changing a feature, read that feature's `FEATURE.md`. For nested features, read both the parent feature document and the nested feature document.
- Existing legacy mismatches are transitional. Do not copy them as precedent for new code.
- Keep changes focused on the requested task and move touched code toward the target architecture when practical.

## Project Context

- This is an Angular 21 application using strict TypeScript, SSR/hydration, PrimeNG, NgRx SignalStore, and Hydra-style API services.
- Use the npm scripts in [package.json](package.json): `npm run lint`, `npm run test:ci`, `npm run build`, `npm run quality`, `npm run format`, and `npm run format:check`.
- Do not add dependencies or new architectural patterns unless the task explicitly requires it and the existing codebase has no suitable pattern.

## Architectural Ownership

- Business code belongs to the owning feature under `src/app/features/<feature>/`.
- `core` is only for app-wide infrastructure: runtime config, HTTP transport infrastructure, SSR/hydration primitives, routing primitives, themes, and shared operation/request-state helpers.
- `shared` is only for generic, domain-agnostic UI, directives, validators, pipes, and pure utilities.
- `layouts` compose application shells. Layouts may render feature-owned widgets through public APIs, but they must not own business workflows or inject concrete feature stores directly.
- Rendering location and provider scope do not decide ownership. The strongest business invariant decides ownership.

## Feature Structure

- New feature code follows the concern-oriented layout from [ARCHITECTURE.md](ARCHITECTURE.md): `data-access/`, `http/`, `ports/`, `ui/`, `state/`, `models/`, `providers/`, and optional nested `features/`.
- Put pages, feature components, dataviews, and forms under `ui/`.
- Put feature guards, resolvers, and feature-scoped interceptors under `http/{guards,resolvers,interceptors}`. Do not place new guards or resolvers at the feature root.
- Put API services under `data-access/services/<concern>/` and pure normalization helpers under `data-access/adapters/`.
- Put reusable feature contracts under concept-first `models/<concept>/` folders. Store state interfaces belong in `state/`, not `models/`.
- Put stores in slice-first `state/<slice>/` folders. Each externally consumed slice exposes a local `index.ts`, and `state/index.ts` re-exports only stable public store APIs.
- Do not create empty architecture folders.

## Ports And Boundaries

- Published behavioral contracts live with the owner: prefer `features/<feature>/ports/<port-name>/` or `core/<concern>/ports/<port-name>/`.
- Do not create new top-level `src/app/ports/` contracts unless no stable owner exists; treat existing ones as compatibility only.
- A port folder contains `<port-name>.interface.ts`, `<port-name>.token.ts`, and `index.ts`.
- Bind ports from the owner using providers and prefer `{ provide: TOKEN, useExisting: ConcreteService }` to avoid double instantiation.
- Do not create a port for behavior consumed only inside one feature.

## Imports And Public APIs

- Use path aliases when crossing a feature, layer, or concern boundary: `@features`, `@core`, `@shared`, `@layouts`, `@app`, and `@env`.
- Use relative imports only within a tight local area such as one component folder, one state slice, or one concern-local file group.
- External consumers import through documented public APIs and barrels, not private implementation paths.
- `core` must never import from `features`.
- `shared` must never import from `features`, feature state, feature services, or feature domain models.
- Cross-feature dependencies are forbidden by default. Use only documented public APIs or owner-published ports approved by the relevant `FEATURE.md`.

## State And Async Work

- Use NgRx SignalStore patterns already present in the codebase.
- Use `patchState` for mutation. Do not assign store state directly.
- Use `rxMethod` and `tapResponse` for store-level async flows.
- Do not use Angular `rxResource` or `httpResource` as the store standard.
- Every async action exposes explicit request state from `@core/state/request-state`.
- Use named `CallState` fields for stores with multiple async actions.
- Use `withQueryState` only for stores with exactly one primary query concern.
- Use `withEntities` for entity collections instead of maintaining duplicate manual arrays when entity helpers cover the use case.
- Store events are typed with `eventGroup` and emitted for cross-layer consequences such as navigation, toasts, or sibling store coordination.

## API And Data Access

- Feature API services extend `HydraApiService` from `@core/services/hydra-api`.
- Do not build `HttpParams` or `HttpHeaders` manually outside `HydraApiService`; extend protected helpers when extra behavior is needed.
- Services return transport types. Derive view models in stores, adapters, or UI layers according to ownership.
- If multiple stores interpret the same loose API fields, centralize normalization in a pure feature-owned adapter.
- Do not add new feature CRUD services to legacy core service folders.

## Routing, SSR, And Hydration

- `app.routes.ts` owns top-level layout selection and feature entry points. Each feature owns its route tree.
- Resolvers are only for route-critical data. They must seed the owning store, use explicit `TransferState`, or be the only loading path for that data.
- Avoid duplicate fetches between resolvers, page initialization, and store hooks.
- SSR behavior must be explicit for browser navigation, per-request SSR, hydration, and request-less server contexts.
- Do not serialize bearer tokens, secrets, or broad authenticated API responses into `TransferState`.
- Use `TransferState` only for targeted, small, route-critical handoffs that would otherwise refetch immediately on hydration.
- Secondary UI data such as hidden tabs, dialogs, switchers, pickers, and popovers should load browser-only or on user action unless the feature document says otherwise.

## UI Responsibilities

- Pages orchestrate route params, stores, navigation, and child composition.
- Dataviews render collection state and emit paging, sorting, filtering, selection, and action events. They do not inject feature stores or call data-access services.
- Forms manage form state and emit submit/cancel-style events. They do not own navigation or direct API calls.
- Domain-aware components stay in the owning feature even when rendered in a layout.
- Move a component to `shared` only when it is truly domain-agnostic and imports no feature models, stores, services, or routes.

## Documentation

- Keep `FEATURE.md` files short and normative. Update them when changing feature ownership, public APIs, route entry points, published ports, or invariants.
- Do not duplicate implementation details or file catalogs in feature documentation.
- When adding a new top-level feature, add `src/app/features/<feature>/FEATURE.md`.
- When adding a nested business subfeature that owns routes, state, services, or workflow decisions, add its own `FEATURE.md`.

## Verification

- Run the narrowest useful validation after changes. Prefer targeted tests first, then `npm run lint`, `npm run test:ci`, `npm run build`, or `npm run quality` when the blast radius justifies it.
- If validation cannot be run, state the reason clearly in the final response.
- Do not fix unrelated failures unless the user asks for that work.
