# Frontend Architecture

This document defines the target architecture for the frontend of `fireguard-sso-web`.

It is normative.

- New code must follow this document.
- Refactors should move legacy code toward this document.
- Existing code that does not match this document should be treated as transitional, not as precedent.

This file is intentionally opinionated. It is not a catalog of everything that exists today.

## 1. Scope

This document governs:

- Folder ownership and dependency direction.
- Routing, layouts, guards, and resolvers.
- State management and store scoping.
- API access, HTTP infrastructure, SSR, and hydration.
- Page, component, form, and dataview responsibilities.
- Import aliases, barrels, and public APIs.
- Quality expectations for tests and documentation.

This document does not govern:

- Visual design rules.
- Naming of business concepts coming from the backend.
- Backend architecture.
- One-off migration mechanics beyond the transition rules in this file.

## 2. Reading Guide

- Target rule: mandatory for new code.
- Transitional rule: accepted only when working in legacy areas that are not aligned yet.
- Anti-pattern: must not be introduced in new code.

## 3. Architectural Principles

### 3.1 Feature-first business ownership

Business code belongs to the feature that owns the workflow.

That includes:

- feature state,
- feature-specific models,
- feature data-access services,
- feature guards and resolvers,
- route entry pages,
- feature UI components.

`core` is not a generic home for business code.

### 3.2 Core is for application-wide infrastructure

`core` exists for cross-cutting concerns that are global to the application, not for every domain concept.

Typical `core` concerns are:

- app bootstrap,
- auth and session bootstrap,
- environment and runtime configuration,
- HTTP base infrastructure,
- SSR and hydration infrastructure,
- global routing primitives,
- theme and shell-level services,
- truly application-wide state.

### 3.3 Pages orchestrate, UI components render

Pages are route entry points and own orchestration.

Pages may:

- read route params and query params,
- call stores and services,
- trigger navigation,
- coordinate multiple child components,
- own form controls that affect routing or data loading.

Reusable UI components, including dataviews, must stay presentational.

They must not hide business orchestration.

### 3.4 SSR behavior must be explicit

Every route-critical data flow must define how it behaves across:

- browser-only navigation,
- per-request SSR,
- hydration,
- optional prerender contexts.

Avoid accidental duplicate fetches between resolver, store initialization, and post-hydration page loading.

### 3.5 Public APIs over deep imports

Each architectural area exposes a small public surface.

Consumers should depend on public barrels and aliases, not on private internal files.

### 3.6 Prefer explicit ownership over convenience

Do not place code where it is easiest to import.

Place code where its responsibility is clearest.

Provider scope, route scope, and business ownership are different concerns and must not be conflated.

## 4. Layer Model

The frontend is organized into five top-level responsibilities under `src/app`.

| Layer | Owns | Must not own |
| --- | --- | --- |
| `app` shell | global composition via `app.routes.ts` and `app.config.ts` | feature business logic |
| `core` | application-wide infrastructure and app-wide context | feature-specific domain logic by default |
| `layouts` | shells and layout-local behavior | domain fetching or domain workflows |
| `features` | routed workflows and owned business logic | global bootstrap and generic primitives |
| `shared` | generic UI primitives and pure utilities | business orchestration, API calls, router knowledge |

## 5. Dependency Direction

The allowed dependency direction is:

```text
app shell -> core, layouts, features, shared
layouts -> core, shared
features -> core, shared
shared -> shared
core -> core
```

Additional rules:

- `core` must never depend on `features`.
- `shared` must never depend on `features` or feature state.
- `layouts` must not depend on feature internals.
- Cross-feature imports are forbidden by default.
- The only acceptable cross-feature dependency is through an explicit public API when one feature is the declared owner of a nested business area.

If a dependency direction feels awkward, the structure is probably wrong.

## 6. Target Folder Structure

The target structure is:

```text
src/app/
  app.config.ts
  app.routes.ts
  core/
    auth/
    config/
    http/
      interceptors/
      transfer-state/
      errors/
    routing/
      guards/
      resolvers/
      strategies/
    services/
    state/
    themes/
  layouts/
    dashboard/
      components/
      directives/
      services/
      dashboard-layout.component.ts
      index.ts
    focused/
    split/
  features/
    auth/
      auth.routes.ts
      pages/
      forms/
      components/
      data-access/
      state/
      models/
      guards/
    organization/
      organization.routes.ts
      pages/
      components/
      forms/
      dataviews/
      data-access/
      state/
      models/
      guards/
      resolvers/
      features/
        facilities/
        equipments/
        inspections/
  shared/
    components/
    directives/
    pipes/
    utils/
    validators/
```

This structure is a target, not a statement that all current files already follow it.

## 7. Folder Ownership Rules

### 7.1 `core`

Target rule:

`core` contains only application-wide concerns.

Allowed in `core`:

- bootstrap and providers used by the whole app,
- auth/session bootstrap,
- HTTP base services and interceptors,
- SSR request forwarding and hydration infrastructure,
- app-wide routing primitives,
- app-wide state such as auth, session, user context, theme, and global notifications,
- theme presets and shell-level services.

Not allowed in `core`:

- feature-owned CRUD services,
- feature-owned DTO catalogs,
- feature-owned entity stores,
- feature pages and feature UI.

Transitional rule:

Existing business code under `core/models`, `core/services/api`, and `core/stores` may remain temporarily, but new business code must not extend those legacy buckets unless the concern is truly application-wide.

### 7.2 `layouts`

Target rule:

Each layout owns shell composition only.

Layouts may contain:

- layout component,
- layout-local directives,
- layout-local presentational components,
- layout-local services for shell behavior,
- shell navigation and shell state wiring.

Layouts must not contain:

- domain API calls,
- feature-specific stores,
- entity business rules,
- feature-specific route logic.

If a service is only used by one layout, it stays inside that layout folder.

It moves to `core` only when it becomes cross-layout infrastructure.

### 7.3 `features`

Target rule:

Features own business workflows end-to-end.

Each feature may contain:

- route configuration,
- pages,
- feature components,
- forms,
- dataviews,
- data-access services,
- feature state,
- feature models,
- feature guards and resolvers when they are not application-wide.

Feature code should be colocated with the business workflow it serves.

Do not centralize business logic in `core` just to make imports shorter.

### 7.4 `shared`

Target rule:

`shared` is for generic reuse with no business ownership.

Allowed in `shared`:

- generic UI primitives,
- pure directives,
- pure pipes,
- pure validators,
- pure utilities.

Not allowed in `shared`:

- API services,
- stores,
- resolvers,
- guards with business rules,
- components that know a specific domain.

A component becomes `shared` only when it is generic by design, not simply because it is reused twice.

## 8. API and HTTP Architecture

### 8.1 Concrete API clients belong to the owning feature

Target rule:

Concrete business-facing API services live in `features/<feature>/data-access`.

Examples:

- `features/organization/data-access/organization.service.ts`
- `features/organization/features/facilities/data-access/facility.service.ts`
- `features/auth/data-access/auth.service.ts`

Do not add new feature CRUD services to `core/services/api`.

### 8.2 `core/http` owns cross-cutting HTTP infrastructure

Target rule:

`core/http` owns only shared HTTP concerns such as:

- base API client abstractions,
- common API error mapping,
- interceptors,
- SSR request forwarding,
- transfer-state helpers,
- transport-level helpers.

`core/http` must not become a second home for feature-specific endpoints.

### 8.3 Contracts live close to data access

Target rule:

Backend request and response contracts live next to the data-access service that owns them.

Recommended structure:

```text
features/organization/data-access/
  organization.service.ts
  contracts/
    create-organization.input.ts
    organization.output.ts
```

Feature-local view models live under `features/<feature>/models`.

Do not mix backend contracts and UI-only models in one global folder.

### 8.4 Error handling is layered

Target rule:

- `core/http` handles transport-level concerns.
- interceptors handle cross-cutting protocol concerns,
- data-access services map backend contracts,
- stores expose user-facing async state,
- pages decide UI reactions.

Do not push all user-facing error behavior into interceptors.

Do not hide transport decisions inside presentational components.

## 9. State Management Rules

### 9.1 Store location follows ownership, not provider scope

Target rule:

Where a store lives in the folder tree depends on who owns the business concern.

It does not depend on whether the store is:

- root-provided,
- component-provided,
- route-scoped.

Example:

If a store represents the active organization, it still belongs to the organization feature even if it is `providedIn: 'root'`.

### 9.2 `core/state` is reserved for app-wide state

Target rule:

Only state that is truly application-wide belongs in `core/state`.

Typical examples:

- auth,
- session,
- user context,
- global notifications,
- theme,
- shell state.

Entity collections and feature workflows belong in feature state folders.

### 9.3 Prefer one canonical store per concern

Target rule:

There should be one clear source of truth for a given concern.

Avoid multiplying independent local store instances for the same canonical collection unless isolation is intentional and documented.

Component-scoped stores are allowed when all of the following are true:

- the state is ephemeral,
- the state is not shared across routes or shells,
- duplication is acceptable,
- the lifecycle should reset with the component instance.

If those conditions are not true, use a longer-lived feature store.

### 9.4 Use explicit async state

Target rule:

Async actions must expose explicit state.

The current operation pattern is acceptable as the default:

- idle,
- loading,
- success,
- error.

Do not hide async status in ad-hoc booleans when a canonical operation state already exists.

### 9.5 Pages own orchestration

Target rule:

Pages own:

- route param reading,
- query param synchronization,
- navigation,
- composition of multiple stores,
- orchestration between forms, dataviews, and state.

Dataviews and reusable UI components must not own:

- router synchronization,
- hidden debounced reload logic,
- direct store mutations,
- API calls.

If a dataview needs data, the page passes it in.

If a dataview needs to request an action, it emits an output.

## 10. Routing, Guards, and Resolvers

### 10.1 Route ownership

Target rule:

- `app.routes.ts` owns application shell composition and top-level layout selection.
- each feature owns its own route tree.
- child features own nested route trees only when their business ownership is truly nested.

Nest a feature under `features/<parent>/features/<child>` only when both are true:

- the URL hierarchy is nested,
- the business ownership is nested.

Do not use nested features as a generic grouping trick.

### 10.2 Guard responsibility

Target rule:

Guards answer access and redirection questions.

Guards may:

- allow,
- deny,
- redirect.

Guards must not:

- preload feature data,
- mutate broad feature state as a side effect,
- replace resolvers or page initialization.

Application-wide guards belong in `core/routing/guards`.

Feature-specific guards belong in the owning feature.

### 10.3 Resolver responsibility

Target rule:

Resolvers are for route-critical data that must be available before activation.

Good resolver use cases:

- active route context,
- permission-dependent entity context,
- title or breadcrumb context derived from the route entity,
- blocking data without which the route is invalid.

Bad resolver use cases:

- paginated lists,
- dashboard widgets,
- optional secondary data,
- data that can load after first paint without breaking the route.

### 10.4 Resolver and store interaction

Target rule:

A resolver must not cause a silent duplicate fetch after navigation.

If a resolver loads data, one of the following must be true:

- it seeds the owning store,
- it writes into transfer state for hydration,
- it is the only load path for that route-critical data.

Fetching the same entity in both resolver and page initialization is an anti-pattern.

## 11. SSR, Hydration, and Bootstrap

### 11.1 App initialization is for app-wide bootstrap only

Target rule:

App initializers are reserved for concerns that must be known before the app can safely continue.

Examples:

- auth/session restoration,
- runtime configuration,
- shell-level initialization.

Do not move feature page loading into global bootstrap.

### 11.2 Distinguish per-request SSR from prerender

Target rule:

Any logic that depends on request context must explicitly distinguish:

- per-request SSR,
- browser runtime,
- prerender or contexts without request state.

Do not assume request-bound auth state exists in every server execution context.

### 11.3 Hydration must avoid waste

Target rule:

If data is required during SSR for first render, define a hydration strategy up front.

Allowed strategies:

- transfer state,
- seeded feature store,
- explicit page-level reload when duplication is acceptable.

For route-critical entities, duplication is not acceptable by default.

### 11.4 Platform-specific access stays isolated

Target rule:

Direct use of browser-only or server-only APIs must stay inside platform-aware infrastructure or guarded code paths.

Do not scatter platform checks across presentational components.

## 12. Feature Internal Conventions

Within a feature, use the following responsibilities.

### 12.1 `pages/`

Pages are route entry containers.

They:

- inject stores and routing primitives,
- translate route and query state into inputs for children,
- handle user flows,
- compose multiple child components.

### 12.2 `components/`

Feature components are reusable only within the owning feature by default.

They may know feature models.

They must not silently become global building blocks.

### 12.3 `forms/`

Forms expose typed inputs and outputs for the owning feature.

They may manage internal form state.

They must not own navigation or direct API access.

Cross-feature reusable validators stay in `shared/validators`.

Feature-specific validators stay with the feature.

### 12.4 `dataviews/`

`dataviews` are allowed for complex list, grid, table, or card browsing UIs.

They are still presentational.

They may:

- render collection state,
- emit paging, sorting, filtering, selection, and action events,
- keep tiny UI-only state.

They must not:

- inject feature stores,
- call data-access services,
- trigger hidden reload chains,
- own router state.

## 13. Import, Alias, and Barrel Rules

### 13.1 Use aliases at architectural boundaries

Target rule:

Use path aliases for cross-folder architectural imports.

Use relative imports only inside a small local area.

### 13.2 Every public area exposes a public API

Target rule:

Every folder intended for external consumption must expose an `index.ts` or a clearly named single entry file.

Examples:

- `features/organization/index.ts`
- `features/organization/data-access/index.ts`
- `layouts/dashboard/index.ts`

Deep imports into another area's private files are forbidden.

### 13.3 Barrels are public surfaces, not dumping grounds

Target rule:

Barrels should export the intended public API only.

They must not re-export every internal helper by default.

### 13.4 No architectural import shortcuts through legacy folders

Anti-pattern:

Creating or keeping a broad alias only to bypass ownership rules.

Examples to avoid:

- putting new feature business services under `@core/services/api`,
- putting new feature models under `@core/models`,
- importing sibling feature internals through long deep paths.

## 14. Testing and Documentation Rules

### 14.1 Test the architectural boundary

Target rule:

Tests must focus on the responsibility of the unit.

- data-access services: contract mapping and transport behavior,
- stores: state transitions and orchestration,
- guards and resolvers: routing decisions,
- pages: orchestration and child interaction,
- presentational components: rendering and outputs.

### 14.2 Architecture decisions must be visible

Target rule:

When introducing a new pattern, update this document or add a short architecture note.

Do not let new patterns appear silently through implementation drift.

### 14.3 Prefer meaningful documentation over mechanical comments

Target rule:

Document:

- public abstractions,
- non-obvious constraints,
- SSR or routing caveats,
- reasons for exceptions.

Avoid verbose comments that only restate types or obvious code.

## 15. Approved Patterns

The following patterns are approved for new work.

- A page injects one or more stores, reads route state, and passes plain inputs and outputs to child components.
- A feature resolver loads the active entity context and seeds the owning feature store.
- A layout keeps its sidebar services and resize directives inside its own folder.
- Global HTTP concerns remain in `core/http/interceptors`.
- Global bootstrap remains in `app.config.ts` and dedicated core providers.
- A feature owns its own `data-access`, `state`, and `models` folders.

## 16. Anti-patterns

The following patterns must not be introduced in new code.

- Adding new feature CRUD services under `core/services/api`.
- Adding new feature DTO catalogs under `core/models`.
- Loading the same entity in both resolver and page initialization.
- Putting router synchronization or hidden reload logic inside a dataview.
- Using `providedIn: 'root'` as a substitute for deciding ownership correctly.
- Importing sibling feature internals through deep paths.
- Making `shared` depend on feature state or domain services.
- Putting domain data fetching inside layouts.
- Keeping a component presentational in name only while it orchestrates data loading internally.

## 17. Transition Rules

The current codebase is not expected to align everywhere on day one.

Use these transition rules.

### 17.1 Legacy core business buckets

Transitional rule:

Existing code under:

- `core/models`,
- `core/services/api`,
- `core/stores`

may remain temporarily.

However:

- do not grow these folders with new feature-owned business code,
- when touching a feature substantially, move new files toward feature ownership,
- prefer migration by opportunity rather than big-bang rewrites.

### 17.2 New code follows target ownership immediately

Transitional rule:

Even if surrounding code is legacy, any new file should be placed according to the target structure unless that would create disproportionate churn.

### 17.3 Exceptions require an explicit note

Transitional rule:

If a change must violate this document temporarily, add a short note in the pull request or in a local architecture note explaining:

- why the exception exists,
- how long it is expected to remain,
- what migration path is intended.

## 18. Review Checklist

Before merging a change, verify the following.

- Is the file placed in the layer that owns the concern?
- Does the dependency direction respect the layer model?
- Is business logic owned by a feature instead of being pushed into `core`?
- Is app-wide infrastructure kept out of feature folders?
- Does the page own orchestration instead of the dataview or child component?
- If a resolver exists, is it truly route-critical and free of duplicate fetches?
- If SSR is involved, is hydration behavior explicit?
- Are imports going through public APIs instead of deep private files?
- Are new tests focused on the correct architectural boundary?
- If the code deviates from this document, is the exception explicit?

## 19. Summary

The target architecture is:

- feature-first for business code,
- core-only for application-wide infrastructure,
- layouts as shells,
- shared as generic primitives,
- explicit ownership of state and API access,
- explicit SSR and hydration rules,
- public APIs instead of deep imports.

When the current code and this document disagree, new work should move toward this document.
