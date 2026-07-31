# Frontend Architecture

This document defines the target frontend architecture for `fireguard-sso-web`.

It is normative: new code must follow this document, and refactors move code toward it.

This file is intentionally opinionated. It defines ownership, dependency, and naming rules. It is not a catalog of every file that exists today.

## Table of Contents

1. [What This Document Governs](#1-what-this-document-governs)
2. [Core Ideas](#2-core-ideas)
3. [Layer Model](#3-layer-model)
4. [Dependency Direction](#4-dependency-direction)
5. [Published Contracts and Adapters](#5-published-contracts-and-adapters)
6. [Fast Placement Guide](#6-fast-placement-guide)
7. [Canonical Top-Level Structure](#7-canonical-top-level-structure)
8. [Canonical Folder Templates](#8-canonical-folder-templates)
9. [Naming Conventions](#9-naming-conventions)
10. [Responsibility By File Type](#10-responsibility-by-file-type)
11. [HTTP Transport Architecture](#11-http-transport-architecture)
12. [Routing, SSR, and Hydration](#12-routing-ssr-and-hydration)
13. [Imports and Public APIs](#13-imports-and-public-apis)
14. [Testing and Documentation Expectations](#14-testing-and-documentation-expectations)
15. [Approved Patterns](#15-approved-patterns)
16. [Anti-patterns](#16-anti-patterns)
17. [Review Checklist](#17-review-checklist)
18. [Summary](#18-summary)

## 1. What This Document Governs

### 1.1 The stack

The application is an **Angular 21** SPA with SSR and hydration:

- standalone components with the signals API (`input()`, `output()`, `computed()`, `signal()`, `linkedSignal()`), `ChangeDetectionStrategy.OnPush` on every component,
- **NgRx SignalStore** (`@ngrx/signals`, plus `@ngrx/signals/events` for typed store events) for feature state,
- **PrimeNG 21** components themed through a custom preset (`core/primeng/presets/`), styled with **Tailwind v4** utilities only,
- Hydra/JSON-LD API access through `HydraApiService` (section 11),
- strict TypeScript (`strict`, `strictTemplates`, no `any`, no non-null assertions),
- tooling: `oxlint` / `oxfmt`, unit tests via `ng test` (vitest runner), Playwright e2e under `e2e/`.

Do not introduce new dependencies or architectural patterns unless the task requires it and no existing pattern fits.

### 1.2 Scope

This document governs:

- folder ownership and dependency direction,
- naming conventions for frontend artifacts (section 9),
- routing, layouts, guards, resolvers, and providers,
- state placement and store scoping,
- API access, HTTP infrastructure, SSR, and hydration,
- page, component, dataview, and form responsibilities,
- public APIs, aliases, and barrel usage,
- review expectations for architecture changes.

This document does not govern:

- visual design conventions (see `PRODUCT.md`),
- backend architecture,
- naming of backend business concepts.

### 1.3 Reading guide

Rules in this document are labeled two ways:

- **Target rule**: mandatory for new code.
- **Anti-pattern**: must not be introduced in new code.

Everything else (templates, examples, notes) illustrates how to satisfy the target rules. When existing code and this document disagree, the existing code is transitional: do not copy it as precedent, and move touched code toward the document when practical. Approved exceptions are recorded in the owning feature's `FEATURE.md` (section 14.2).

## 2. Core Ideas

### 2.1 Feature-first business ownership

Business code belongs to the feature that owns the workflow.

That includes:

- feature state,
- feature-owned models and contracts,
- feature data-access services,
- feature guards, resolvers, and providers,
- route entry pages,
- feature UI components.

`core` is not a fallback location for business code.

### 2.2 `core` is app-wide infrastructure only

`core` exists for concerns that are global to the application.

Typical `core` concerns are:

- runtime configuration,
- HTTP transport infrastructure,
- SSR and hydration primitives,
- app-wide routing primitives,
- theme and shell-level utilities,
- neutral port implementations backing shared UI contracts,
- transport models shared by the whole app,
- shared operation primitives used by many stores.

When shared UI needs app-wide behavior, inject a neutral contract published by
the owning concern, usually `core/<concern>/ports/` or `features/<feature>/ports/`
(section 5), and keep the concrete implementation with that owner.

### 2.3 `shared` is generic and domain-agnostic

`shared` is for generic UI primitives and pure utilities.

Reused does not mean shared.

A component is `shared` only when it is generic by design and has no feature ownership (section 6.4 gives the operational checklist).

Shared UI may depend on neutral contracts published by an owning concern, but it must not
import concrete `core` services directly.

### 2.4 Layouts compose shells, not workflows

Layouts own shell composition only.

Layouts may render feature-owned shell widgets when the shell needs domain-aware UI, but the layout must not become the owner of the underlying business workflow: the widget's stores, services, and models stay in the owning feature, and the layout consumes behavioral data through published ports only (section 4).

### 2.5 Pages orchestrate, child components render

Pages are route entry containers.

Pages may:

- read route params and query params,
- coordinate stores and services,
- trigger navigation,
- compose child components,
- decide orchestration and error handling.

Dataviews and reusable UI components must not hide orchestration: injecting a feature store, calling a data-access service, or synchronizing the router from inside a child component is orchestration, and it belongs to the page.

### 2.6 Provider scope does not decide ownership

Whether something is root-provided, route-scoped, or component-scoped does not decide where it lives.

Ownership follows the concern.

Example:

`provideAuthFeature()` is called from `app.config.ts`, but it is still owned by `features/auth` because it bootstraps auth behavior.

### 2.7 Rendering location does not decide ownership

A component can be rendered in a layout and still belong to a feature.

Examples:

- `NotificationBell` belongs to `features/account/ui/components` because it depends on account notifications.
- `OrganizationSwitcher` belongs to `features/organization/ui/components` because it depends on organization context.
- `Board` and `Calendar` belong to `shared` (as their own concepts, `shared/board/` and `shared/calendar/`) because they have no domain dependency — their inputs are plain scalars and generic types with no coupling to any feature model.

The converse also holds: being domain-agnostic is necessary but not sufficient. A generic component whose consumers all sit inside one feature subtree belongs to that subtree (section 2.8), not to `shared` — that is why the dashboard trend card and its metric strip live under `features/organization/ui/components/organization-dashboard/`.

### 2.8 Usage locality decides placement

Every model, type, util, constant, and option set lives at the **lowest scope that covers all of its consumers**. Proximity to the consumer is the default; height in the architecture is earned only by shared usage.

The rule has two directions:

- **Start local.** A unit used by a single component lives inside that component's folder, not at the feature level. Do not pre-emptively hoist something to `features/<feature>/models` (or `utils`, `constants`, `options`) "in case" another consumer appears.
- **Lift only when shared, and only as far as needed.** When a second consumer appears, move the unit up to the lowest scope that contains both consumers — to the feature's own `models/` · `utils/` · `constants/` · `options/` when several components of one feature use it, to `shared/` when several features use it and it is domain-agnostic, to the owning feature's public API when several features use it and it is domain-bearing, and to `core/` only when it is app-wide infrastructure.

Two hard constraints keep this honest:

- **Never reach down.** Code outside a component must not import from that component's private `models/`, `utils/`, `constants/`, or `options/` folder. If an outside consumer needs it, lift it first; deep cross-imports are forbidden (section 13.4).
- **A shared registry is not copied.** A domain-bearing unit consumed by another feature is re-exported through its owner's public API, never duplicated into the consumer.

This generalizes sections 2.6 and 2.7: just as provider scope and rendering location do not grant ownership, neither does convenience. The set of consumers — and nothing else — determines how high a unit sits.

### 2.9 Rule of three — do not force DRY

Lifting an _already-shared_ unit (above) is about placement. **Creating** a new shared abstraction is a separate, stricter decision: do not extract a util, helper, constant, or wrapper until the **third** real usage appears.

- Two near-duplicate snippets are cheaper left inline than abstracted prematurely. A helper called from a single site — or a one-line pass-through that only forwards its arguments — earns nothing but an extra file and a layer of indirection.
- Inline first. Let a genuine third consumer prove the shape before you name it. A wrong early abstraction is more expensive to unwind than a little duplication.
- This does not contradict "lift when a second consumer appears" (section 2.8): a second consumer justifies _moving_ a unit that already earns its existence to the lowest common scope; it does not justify _inventing_ a new one. The trigger to abstract is the third occurrence, not the second.

Duplication is a smell, not a crime. Prefer clarity now over a speculative abstraction that may never pay off.

## 3. Layer Model

The frontend is organized into five top-level responsibilities under `src/app`.

| Layer       | Owns                                                          | Must not own                                                                        |
| ----------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `app` shell | top-level composition via `app.routes.ts` and `app.config.ts` | feature business logic                                                              |
| `core`      | application-wide infrastructure                               | feature-specific workflows                                                          |
| `layouts`   | shell composition and layout-local behavior                   | business workflows; concrete feature stores or services (consume ports — section 4) |
| `features`  | owned business workflows end-to-end                           | global infrastructure and generic primitives                                        |
| `shared`    | generic, domain-agnostic primitives                           | business orchestration, feature state, API access                                   |

## 4. Dependency Direction

The allowed dependency direction is:

```text
app shell -> core, layouts, features, shared
layouts -> core, shared, features (through public APIs and published ports)
features -> core, shared, owned nested features (through public APIs), explicitly approved sibling-feature public APIs
shared -> shared, and owner-published ports only
core -> core
```

Additional rules:

- `core` must never depend on `features`. The one sanctioned inversion is a core-owned port implemented and bound by a feature (section 5).
- `shared` must never depend on feature internals: feature state, feature services, feature domain models, or feature UI. The **only** feature code `shared` may consume is a published port (interface + token) exposed through the owning feature's `ports/` barrel.
- `shared` must not depend on concrete `core` service implementations either; it injects the port published by the owning core concern.
- contracts belong to the owner of the behavior, not to a central abstraction folder.
- layouts may import feature-owned shell widgets through documented feature public APIs, but they must not inject concrete feature stores or feature services directly.
- when a layout needs behavioral data from a feature (user identity, notifications, organization context), it must consume a stable port instead of injecting the owning feature's store.
- cross-feature dependencies are forbidden by default.
- a cross-feature dependency is acceptable only when one feature explicitly owns the business concern, exposes a stable port or documented public API for it, and the dependency is recorded in both features' `FEATURE.md` (section 14.2).
- parent features and nested child features may depend on each other only through explicit public APIs; nested ownership does not justify private deep imports.

## 5. Published Contracts and Adapters

A **port** is a behavioral contract expressed as a TypeScript interface and an `InjectionToken`. It has no implementation. It isolates a consumer from a concrete class.

A **port adapter** is the concrete injectable class that fulfills a port. Port adapters live in `core/` or in the owning feature (usually a `data-access/` or `services/` class) and are bound to their ports through owner providers.

Do not confuse a port adapter with a **data adapter**: a data adapter is a pure mapping function in `data-access/adapters/` with no DI and no side effects (section 10.6). When this document says "adapter" in a ports context, it means the port-implementing class; in a data-access context, it means the pure function.

### 5.1 Ownership-first contract placement

Contracts live beside the concern that owns the behavior.

Preferred locations:

- `features/<feature>/ports/` for business capabilities published outside the owning feature (one nested folder per port),
- `core/<concern>/ports/` when an app-wide infrastructure concern publishes a contract to `shared`, `layouts`, or the app shell — flat (`<port>.interface.ts` + `<port>.token.ts` + `index.ts`) as long as the concern publishes a single contract (for example `core/theme/ports/`) — or `core/<port-name>/` when the contract is a pure port with no local concern service (for example `core/boot-readiness/`),
- a top-level application contracts area only in the rare case where no stable owner exists (none exists today; do not create one without a documented reason).

In this codebase, the default target is owner-local contracts.

### 5.2 Feature-owned ports — `features/<feature>/ports/`

Use a feature-owned port when the behavioral contract is owned by one feature but intentionally consumed outside that feature by a layout, `shared`, `core`, or an approved sibling feature.

Good candidates:

- `features/auth/ports/session/` — consumed by auth-owned HTTP interceptors and infrastructure seams,
- `features/account/ports/user-identity/` — consumed by shell composition,
- `features/account/ports/notification-center/` — consumed by the shell sidebar,
- `features/organization/ports/organization-context/` — consumed by layout and sibling features.

File layout (naming details in section 9):

- `features/<feature>/ports/<port-name>/<port-name>.interface.ts`
- `features/<feature>/ports/<port-name>/<port-name>.token.ts`
- `features/<feature>/ports/<port-name>/index.ts`

### 5.3 Core-owned contracts

If infrastructure in `core/` publishes behavior to external consumers, place the contract beside its owning concern in `core/<concern>/ports/` (or `core/<port-name>/` for a pure port with no local concern service) and bind it from the owning core provider. A core concern's `ports/` folder stays flat while it publishes a single contract; introduce per-port subfolders only if a concern ever publishes several.

### 5.4 Placement rule

- Prefer an **owner-local contract** first.
- Prefer a **feature-owned port** when the contract represents a business capability published by a single owning feature.
- Prefer a **core-owned contract** when the contract represents app-wide infrastructure published by one core concern.
- Do not create a port for a contract that is consumed only within a single feature; use a direct injection there.
- Do not create a top-level global port unless no stable owner can be assigned.
- Do not create a contract for configuration tokens such as `ENV_CONFIG`. Configuration tokens are not behavioral ports.

### 5.5 Adapter and provider binding

- Concrete port adapters (feature services, core services) implement the port interface.
- The provider that binds the port must live in the concern that owns the concrete implementation.
- Feature-owned ports are bound by the feature's provider function (`provide<Feature>Feature()` in `<feature>.feature.ts`, or a provider under `providers/`).
- Core-owned contracts are bound in the relevant `core` provider (`provideTheme()`, `provideSplashScreen()`, and similar owner-local providers).
- The binding uses `{ provide: PORT_TOKEN, useExisting: ConcreteService }` to avoid double instantiation. A port that composes several sources may use `useFactory` with `deps` instead (for example `AUTH_SESSION_PORT`, which derives from the auth store and the user-profile port); `useExisting` remains the default.

Worked examples:

- `THEME_PORT` / `ThemePort` is owned by `core/theme/ports/` and bound by `provideTheme()` with `useExisting: ThemeService`; shared UI injects the port, never `ThemeService`.
- `AUTH_SESSION_PORT` / `AuthSessionPort` is owned by `features/auth/ports/session/` and bound by `provideAuthFeature()` (a composed port, bound via `useFactory`); auth-owned interceptors and infrastructure seams consume the token instead of the auth store.

The full list of published ports is inventoried where it belongs: each feature's `FEATURE.md` ("Published Contracts") and `core/README.md` — not in this document.

### 5.6 The inverse-implementation case

`BOOT_READINESS_PORT` shows the inverse-implementation case: the contract is **core-owned** (core consumes it, so it must not import a feature), but the concrete `initialized` signal is owned by the bootstrap feature. The feature therefore binds the core-owned token (`features → core` is allowed), keeping `core → core` intact while letting the splash screen read boot readiness without importing `@features/auth`. When app-wide infrastructure must consume state a feature owns, define a core-owned port and let the feature implement it — never import the feature port into `core`.

If a dependency direction feels awkward, the structure is probably wrong: stop and re-check ownership before adding an exception.

## 6. Fast Placement Guide

Use the following decision order when creating a new file.

### 6.1 Does it know a business concept?

If it knows a domain concept such as organization, facility, equipment, inspection, intervention, account, session, notification, onboarding, or auth, it belongs to the owning feature.

Typical examples:

- feature store,
- feature model,
- feature form,
- feature resolver,
- feature data-access service,
- feature widget.

### 6.2 Is it global infrastructure?

If it exists to support the whole app regardless of business domain, it belongs to `core`.

Typical examples:

- environment providers,
- HTTP interceptors,
- SSR request forwarding,
- page-title strategy,
- theme services,
- generic operation helpers.

### 6.3 Is it shell composition?

If it primarily composes header, sidebar, slots, and navigation shell behavior, it belongs to `layouts`.

If the shell needs a domain-aware widget, the layout imports the widget from the owning feature. The layout does not absorb the widget into `shared`.

### 6.4 Is it generic and domain-agnostic?

If it can be reused without knowing any business model, feature store, or business route, it belongs to `shared`.

A component is not domain-agnostic if it:

- imports a feature-specific model or type,
- injects a feature service or store,
- contains hard-coded business rules or statuses,
- requires feature route context or a feature resolver to make sense.

A component is domain-agnostic if it:

- accepts primitive inputs or generic lightweight shapes,
- avoids feature imports entirely,
- could be moved to another Angular application without feature-specific changes.

Typical examples:

- card primitives,
- metric widgets with generic inputs,
- pure validators,
- generic directives.

### 6.5 If still unsure, use the strongest ownership rule

Choose the folder owned by the strongest business invariant, not the folder that is easiest to import from. In practice: if any candidate owner is a feature, the feature wins over `shared` and `core`; if two features are candidates, the one whose workflow breaks without the unit wins.

## 7. Canonical Top-Level Structure

The target top-level structure is:

```text
src/app/
  app.component.ts
  app.config.ts
  app.config.server.ts      # SSR-only providers merged over app.config.ts
  app.routes.ts
  app.routes.server.ts      # server route rendering modes (SSR/prerender)
  core/
  layouts/
  features/
  shared/
```

Only create folders when they are needed. Empty architectural buckets are noise.

Contracts should live with the owning concern by default.
`features/<feature>/ports/` holds feature-owned contracts intentionally published outside the owning feature.
`core/<concern>/ports/` holds app-wide infrastructure contracts intentionally published outside that core concern.

See section 5 for placement rules and taxonomies.

## 8. Canonical Folder Templates

The following templates define the default structure to create. They show the available buckets, not mandatory boilerplate: keep empty concern folders absent.

### 8.1 `core/` template

`core` is organized **concern-first**: each infrastructure concern is a
self-contained module (a `services/<name>/` folder per service — each with its
own `testing/` — plus the concern's `provider`, `ports/`, `models/`, `utils/`,
and barrel), mirroring the feature layout. A small number of infrastructure
**groupings** (`config/`, `http/`, `routing/`) exist because they own several
sibling primitives rather than one concern; do not add a new grouping unless it
also owns several sibling primitives.

Every service lives in its own folder under the concern's `services/`, with its
spec colocated in a `testing/` subfolder (the app-wide spec placement rule —
section 14.1).

```text
core/
  <concern>/               # one self-contained folder per infrastructure concern
    services/
      <name>/
        <name>.service.ts
        testing/<name>.service.spec.ts
    <concern>.provider.ts  # when the concern is wired from app.config.ts
    ports/                 # when the concern publishes a contract (section 5.3)
    models/                # concern-local type-only declarations
    utils/                 # concern-local pure helpers
    constants/             # concern-local fixed runtime values
    index.ts
  # ── infrastructure groupings (own multiple sibling primitives) ──
  config/
    environment/
  http/
    interceptors/
  routing/
    guards/                # optional
    resolvers/             # optional
    strategies/
  README.md                # documents the core boundary (parity with features' FEATURE.md)
```

Illustrative concerns in this codebase (not an exhaustive inventory): `api` (the
shared transport boundary — `HydraApiService`, Hydra/`ApiError` models, transport
guards), `theme`, `primeng` (design-token presets), `request-state` (CallState
types, factories, `withQueryState` — the shared async store infrastructure of
section 10.11), `boot-readiness` (a pure core-owned port with no local service),
`locale`, `mercure`, `cookie`, `breadcrumb`, `connectivity`, `splash-screen`,
`title`, `indexed-db`, `feedback`.

Target rule:

`core` contains only app-wide infrastructure.

Allowed in `core`:

- runtime configuration,
- base HTTP infrastructure,
- SSR and hydration helpers,
- application-wide guards and routing strategies,
- shared transport models used by many features,
- shared operation primitives for async state,
- theme and shell-level utilities.

Not allowed in `core`:

- feature CRUD services,
- feature entity stores,
- feature-specific model catalogs,
- feature pages and feature UI,
- compatibility shims whose only purpose is to hide real ownership.

Notes:

- each core concern owns its own `services/<name>/` (service + colocated `testing/`), `models/`, `utils/`, and (when published) `ports/` sub-folders — do not reintroduce flat type-first buckets (`core/services`, `core/ports`, `core/models`, `core/utils`, `core/state`, `core/themes`). The `services/` grouping is concern-local; it is not a top-level `core/services` bucket.
- `core/api/models` holds the truly shared, app-wide transport models (Hydra envelope, RFC 7807 `ApiError`, `ConstraintViolation`); a concern-specific model (e.g. Mercure) lives in that concern's own `models/` (`core/mercure/models`).
- `core/request-state` is not a home for business stores. It is limited to shared async store infrastructure such as call-state primitives (`CallState`, `withQueryState`, `toStoreError`).
- a concern's provider lives inside the concern (`core/theme/theme.provider.ts`), not in a separate `core/providers`; each infrastructure provider is wired individually from `app.config.ts` (no `provideCore()` aggregator).

### 8.2 `layouts/` template

```text
layouts/<name>-layout/
  <name>-layout.component.ts
  <name>-layout.component.html
  components/             # optional layout-local shell pieces (header, sidebar, rail)
  slots/                  # optional slot definitions (<slot>.slot.ts + contribution interface)
  providers/              # optional layout providers (slot registries)
  services/               # optional layout-local shell services (services/<name>/ + testing/)
  directives/             # optional
  testing/
    <name>-layout.component.spec.ts
  index.ts
  README.md               # optional, for layouts with a published slot system
```

Target rule:

Each layout owns shell composition only.

Allowed in a layout:

- the layout component,
- layout-local directives and shell components,
- slot definitions and their contribution interfaces, so features can contribute shell widgets without the layout importing them,
- layout-local services for shell behavior,
- shell navigation and shell state wiring,
- imports of feature-owned shell widgets through public APIs.

Not allowed in a layout:

- concrete domain API calls,
- feature entity stores owned by the layout,
- entity business rules,
- hidden data-loading workflows,
- feature-specific route trees.

Important:

- a layout may render a feature-owned widget,
- that does not make the widget shared,
- that does not transfer ownership to the layout.

### 8.3 `features/` template

```text
features/<feature>/
  FEATURE.md              # required (section 14.2)
  <feature>.routes.ts
  <feature>.feature.ts    # optional — provide<Feature>Feature() bootstrap providers
  data-access/
    index.ts              # optional public API
    services/             # optional — transport-facing API services (extend HydraApiService)
      <concern>/          # optional
    adapters/             # optional — pure data adapters
  services/               # optional — feature-owned behavioral services that are NOT transport
    index.ts              # optional public API
    <concern>/            # orchestration, device/browser APIs, offline sync, publication
  access/                 # optional — permission/access helper services derived from access state
    index.ts              # optional public API
    services/
      <concern>/
  setup/                  # optional — published cross-feature setup boundary (DTOs + service)
    index.ts
  navigation/             # optional — feature navigation config consumed by the shell
    index.ts
  http/                   # optional
    guards/               # optional
    resolvers/            # optional
    interceptors/         # optional, feature-scoped only
  ports/                  # optional — published behavioral contracts
    index.ts              # optional public API for external port consumers
    <port-name>/
      index.ts
      <port-name>.interface.ts
      <port-name>.token.ts
  ui/
    pages/                # optional
    components/           # optional
    tables/               # optional — p-table grids for the feature's entity collections
    dataviews/            # optional — p-dataview list/grid browsing surfaces
    forms/                # optional
    dialogs/              # optional
    drawers/              # optional
  state/
    index.ts              # optional public API
    <slice>/
  models/                 # type-only + the two sanctioned runtime exceptions (section 10.10)
    index.ts              # optional public API
    <concept>/
  utils/                  # optional — pure functions shared across the feature
    index.ts
  constants/              # optional — fixed runtime values shared across the feature
    index.ts
  options/                # optional — UI option sets shared across the feature
    index.ts
  providers/              # optional — slot contributions and port bindings
  features/               # optional nested features
  index.ts                # optional public API
```

Target rule:

Each feature owns its business workflow end-to-end through a small set of stable concerns.

A feature may contain:

- route configuration,
- a `<feature>.feature.ts` bootstrap file exporting `provide<Feature>Feature()` when the feature must be wired from `app.config.ts`,
- `data-access/` for transport-facing code, split into `services/` and optional `adapters/`,
- `services/` for feature-owned **behavioral** services that are not transport, not stores, and not pure utilities — orchestration, device/browser APIs (camera, QR, compression), offline sync coordination, and publication workflows (section 10.7); the IndexedDB persistence boundary itself lives in `data-access/services/`,
- `access/` for permission/access helper services derived from the feature's access state (section 10.8),
- `setup/` for a published cross-feature setup boundary exposing stable DTOs and a service so approved consumers do not depend on internal subfeature contracts (section 10.9),
- `navigation/` for feature-owned navigation configuration consumed by the shell (section 10.9),
- `http/` for feature-owned guards, resolvers, and rare feature-scoped interceptors,
- `ports/` for behavioral contracts intentionally published to layouts or approved sibling features,
- `ui/` for pages and feature-owned presentation code,
- `state/` for stores and store-local state types,
- `models/` for feature contracts and reusable feature types,
- `utils/`, `constants/`, and `options/` for pure functions, fixed runtime values, and UI option sets shared across the feature (section 10.13), created only when a unit outgrows a single component (section 2.8),
- `providers/` for slot contributions (`with<Thing>()` factories) and port bindings,
- nested `features/` only when the child is a real ownership boundary.

Notes:

- `ui/` is the only home for `pages/`, `components/`, `tables/`, `dataviews/`, `forms/`, `dialogs/`, and `drawers/`; do not place presentation folders at the feature root or beside `data-access/` and `state/`,
- `data-access/` root should stay small: keep the public barrel at the root, put injectable API classes under `data-access/services/`, and reserve `data-access/adapters/` for pure transformations,
- if a feature owns guards, resolvers, or feature-scoped interceptors, they live under `http/`; do not place them at the feature root,
- keep empty concern folders absent; the template defines ownership boundaries, not mandatory boilerplate,
- create `ports/` only when a feature publishes behavioral contracts consumed by layouts or approved sibling features; do not create `ports/` for contracts consumed only within the feature,
- inside `ports/`, use one folder per published contract and split the interface from the token (`<port-name>.interface.ts` and `<port-name>.token.ts`),
- create `providers/` when a feature exposes bootstrap helpers, slot contributions, or feature-owned providers; each provider is responsible for binding the feature's ports to their concrete adapters,
- create `ui/tables/` for `p-table`-based tabular grids of the feature's entity collections (columns, rows, row menus, sorting, pagination) and `ui/dataviews/` for `p-dataview`-based list/grid card browsing surfaces; both are presentational (section 10.3),
- create `ui/dialogs/` for modal/overlay surfaces and `ui/drawers/` for side-anchored overlay panels; both host their own content but keep heavy form logic in a `ui/forms/` component they compose (section 10.5),
- create `features/` only when both URL structure and ownership are nested,
- keep feature internals colocated instead of centralizing them in `core`.

### 8.4 Nested feature template

Use a nested feature only when both the URL hierarchy and the ownership hierarchy are nested.

A child feature follows the same concern-oriented structure as a top-level feature — including `FEATURE.md` when it owns routes, state, services, or workflow decisions (section 14.2).

```text
features/<parent>/features/<child>/
  FEATURE.md              # required when the child owns routes, state, services, or workflow decisions
  <child>.routes.ts       # optional
  data-access/
    index.ts              # optional public API
    services/             # optional — transport-facing API services
      <concern>/          # optional
    adapters/             # optional
  services/               # optional — feature-owned behavioral services (orchestration, device, offline sync)
    index.ts              # optional public API
    <concern>/
  http/                   # optional
    guards/               # optional
    resolvers/            # optional
    interceptors/         # optional, feature-scoped only
  ui/
    pages/                # optional
    components/           # optional
    tables/               # optional — p-table grids
    dataviews/            # optional — p-dataview browsing surfaces
    forms/                # optional
    dialogs/              # optional
    drawers/              # optional
  state/
    index.ts              # optional public API
    <slice>/
  models/                 # type-only + the two sanctioned runtime exceptions (section 10.10)
    index.ts              # optional public API
    <concept>/
  utils/                  # optional — pure functions shared across the child feature
  constants/              # optional — fixed runtime values shared across the child feature
  options/                # optional — UI option sets shared across the child feature
  providers/              # optional
  features/               # optional deeper nesting
  index.ts                # optional public API
```

Good example:

- `features/organization/features/facilities/`

Nested feature data-access rules:

- a child feature may own its own `data-access/` for child-specific endpoints,
- a child feature may depend on parent feature services or stores only through the parent's documented public APIs,
- a child feature must not reach into the parent's private files, private state slices, `data-access/services/` implementation folders, or `data-access/adapters/` folder.

Bad use case:

- creating nested features only as a generic grouping device with no ownership boundary.

### 8.5 `shared/` template

`shared` is organized **concept-first**, exactly like `core` (section 8.1): one self-contained folder per shared concept, each with its own `index.ts` barrel. **At the root of `shared` there are no type-first buckets** (`shared/components`, `shared/directives`, `shared/validators`, `shared/models`, `shared/utils`, `shared/constants`) — the same rule that bans `core/services` bans them there. Kind buckets belong one level lower, inside a concept's own `ui/`.

```text
shared/
  <concept>/                 # one self-contained folder per shared concept
    index.ts                 # the concept's public API (the only external entry point)
    ui/                      # only when the concept renders something
      components/
        <name>/
          index.ts
          <name>.component.ts
          <name>.component.html
          testing/           # specs and optional test-only fixtures
      directives/
        <name>/
          index.ts
          <name>.directive.ts
          testing/
      pipes/                 # same shape, if a pipe is ever added
    <concept>.validator.ts   # a concept with no UI stays flat: .validator.ts / .utils.ts / .constants.ts / .type.ts
    models/                  # optional local UI-only types and view models
    options/                 # optional static UI option sets
    constants/               # optional local fixed runtime values
    utils/                   # optional pure helpers local to the concept
    testing/                 # specs of the flat, non-UI files
  testing/                   # cross-cutting test doubles (match-media.mock.ts) — the one sanctioned grouping
  README.md                  # inventories the concepts and their entry points
```

A concept that renders something gives **every component, directive, and pipe its own folder** under `<concept>/ui/<kind>/`, with an `index.ts` and a `testing/` — the canonical UI folder template (section 10.2) applied inside the concept. `models/`, `utils/`, `constants/`, and `options/` stay siblings of `ui/` at the concept root, so a shared concept reads like a feature. Nested subcomponents are not nested under their parent: they are sibling folders under `ui/components/`, and their own barrel keeps them addressable.

A concept with **no UI** creates no `ui/` and stays flat (a validator, a util, a type, or a constants file plus their barrel — like `core/boot-readiness`): `initials`, `match-fields`, `table-card-shell`, `tag`, `tag-severity`. Illustrative concepts in this codebase: `tag`, `tag-severity`, `empty-state`, `error-state`, `board`, `calendar`, `chat`, `infinite-scroll`, `match-fields`, `initials`, `nav-row`, `table-card-shell`, `toast`, `splash-screen`, `theme-switcher`, `logo`.

**Prefer PrimeNG over a shared wrapper.** A `shared` component that exists only so call sites avoid repeating PrimeNG markup does not earn its place: use the PrimeNG component directly at each call site and accept the duplication. A wrapper is justified only when PrimeNG genuinely cannot express the need — a capability gap (`board`'s per-drop validation predicate, `calendar`'s scheduler, `toast`'s stacking deck), a rendering shape PrimeNG has no component for (`empty-state`, `error-state`), or an accessibility pattern its components get wrong for the context (`nav-row`, which must not be a `role="menu"`). Style through the design-token preset in `core/primeng/presets/` rather than re-skinning components with `[pt]` at every call site; reserve `[pt]` for structural adjustments (`table-card-shell`) and for ARIA that PrimeNG omits.

Target rule:

`shared` is for generic reuse with no business ownership. Inside a concept, the unit-folder taxonomy of a feature applies (`models/` is type-only; `utils/`, `constants/`, `options/` hold runtime code — section 10.13), restricted to domain-agnostic units: anything that names a business concept does not belong in `shared`.

External consumers import a shared concept through its barrel — `@shared/tag`, `@shared/calendar`, `@shared/empty-state` — exactly as they import `@core/theme` or `@core/api`. There is no root `@shared` barrel and no aggregate kind barrel. Cross-concept imports inside `shared` also go through the sibling concept's barrel (`@shared/tag-severity` from `toast`), mirroring `core → core`.

A deliberately **generic-by-design** UI primitive (zero feature imports, primitive or generic inputs, could move to another app unchanged) may live in `shared` before a second consumer exists — genericity, not consumer count, is the test for shared _UI_ (section 6.4). Runtime units (`utils/`, `constants/`, `options/`) still follow strict usage locality (section 2.8) and are only lifted here once several features consume them.

Allowed in `shared`:

- generic UI primitives and generic collection surfaces,
- pure directives,
- pure pipes,
- pure validators,
- pure utilities,
- shared UI that depends only on neutral contracts published by an owning concern.

Not allowed in `shared`:

- API services,
- stores,
- resolvers,
- guards with business rules,
- domain-aware components,
- transport-shaped code (RFC 7807 helpers, query-param mapping — that is `core/api`),
- slot-contribution providers that import a layout (the layout owns those),
- compatibility re-exports that mask real ownership.

If a shared component needs app-wide infrastructure, inject a contract from
the owning `core` concern instead of importing the concrete implementation.

If a component imports feature models, feature stores, or domain services, it is not shared.

## 9. Naming Conventions

This section is the single normative reference for naming. Earlier and later sections show these conventions in context; when two passages seem to disagree, this section wins. Every convention below is the one the codebase actually follows — deviations that predate this section are transitional (section 9.11) and must not be copied.

### 9.1 Casing

| Element                                                | Casing                 | Examples                                                           |
| ------------------------------------------------------ | ---------------------- | ------------------------------------------------------------------ |
| files and folders                                      | `kebab-case`           | `organization-members.component.ts`, `trusted-device/`             |
| classes, interfaces, type aliases                      | `PascalCase`           | `OrganizationMembersPage`, `AuthSessionPort`, `InterventionStatus` |
| functions, methods, members, signals                   | `camelCase`            | `resolveInterventionTag`, `isLoading`, `authGuard`                 |
| module-level constants, injection tokens, route consts | `SCREAMING_SNAKE_CASE` | `INITIAL_STATE`, `AUTH_SESSION_PORT`, `ORGANIZATION_ROUTES`        |

Interfaces never take an `I` prefix. TypeScript `enum` is banned entirely — enumerations are string-literal unions or const-enum catalogs (section 10.10).

### 9.2 File suffixes

One declaration per file. The file name states the concept, the suffix states the kind. The type separator is a dot (`auth.guard.ts`, never `auth-guard.ts`) — enforced by the schematics defaults in `angular.json`.

| Suffix            | Used for                                                                                                                    | Example                                                               |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `.component.ts`   | Angular components, with an external `.component.html` template                                                             | `organization-members.component.ts`                                   |
| `.directive.ts`   | attribute directives                                                                                                        | `infinite-scroll.directive.ts`                                        |
| `.service.ts`     | injectable services (transport, behavioral, access, core)                                                                   | `organization.service.ts`                                             |
| `.repository.ts`  | IndexedDB/offline repositories                                                                                              | `intervention-outbox.repository.ts`                                   |
| `.store.ts`       | NgRx SignalStore definitions                                                                                                | `organization-members.store.ts`                                       |
| `.routes.ts`      | route configuration, at the feature root                                                                                    | `organization.routes.ts`                                              |
| `.guard.ts`       | functional route guards                                                                                                     | `auth.guard.ts`                                                       |
| `.resolver.ts`    | functional resolvers                                                                                                        | `organization.resolver.ts`                                            |
| `.interceptor.ts` | HTTP interceptors                                                                                                           | `ssr-cookie-forward.interceptor.ts`                                   |
| `.provider.ts`    | provider factories (core concern wiring, feature slot providers)                                                            | `theme.provider.ts`, `rail.provider.ts`                               |
| `.feature.ts`     | feature bootstrap (`provide<Feature>Feature()`) and `signalStoreFeature` blocks                                             | `auth.feature.ts`, `with-query-state.feature.ts`                      |
| `.token.ts`       | `InjectionToken` declarations                                                                                               | `session.token.ts`                                                    |
| `.interface.ts`   | a single `interface`                                                                                                        | `organization-member-output.interface.ts`                             |
| `.type.ts`        | a single `type` alias, including domain literal unions                                                                      | `intervention-status.type.ts`                                         |
| `.model.ts`       | a const-enum catalog with its derived type (feature `models/`), or a local form value/data model (a form's local `models/`) | `organization-permission-name.model.ts`, `login-form-values.model.ts` |
| `.utils.ts`       | pure functions inside a `utils/` folder (plural, matching the folder)                                                       | `quota-status.utils.ts`                                               |
| `.util.ts`        | the resolver of a `<concept>-tag/` registry inside `models/` (singular)                                                     | `intervention-tag.util.ts`                                            |
| `.constants.ts`   | fixed runtime values, in `constants/` and `options/` folders                                                                | `pagination-defaults.constants.ts`, `regional-options.constants.ts`   |
| `.config.ts`      | feature navigation configuration                                                                                            | `organization-navigation.config.ts`                                   |
| `.slot.ts`        | layout slot definitions                                                                                                     | `rail.slot.ts`                                                        |
| `.adapter.ts`     | pure data adapters in `data-access/adapters/`                                                                               | `organization-dashboard-trend.adapter.ts`                             |
| `.validator.ts`   | form validators                                                                                                             | `match-fields.validator.ts`                                           |
| `.strategy.ts`    | core routing strategies                                                                                                     | `page-title.strategy.ts`                                              |
| `.preset.ts`      | PrimeNG design-token presets                                                                                                | `fireguard.preset.ts`                                                 |
| `.mock.ts`        | shared test doubles inside `testing/` folders                                                                               | `match-media.mock.ts`                                                 |
| `.spec.ts`        | unit specs, named after the subject file                                                                                    | `organization-members.store.spec.ts`                                  |
| `index.ts`        | public barrels                                                                                                              | —                                                                     |
| `events.ts`       | the event group of a single-store state slice (bare name inside `events/`)                                                  | `state/auth/events/events.ts`                                         |

Suffixes that must **not** be introduced:

- `.module.ts` — the app is standalone-only,
- `.enum.ts` — no TypeScript enums; use `.type.ts` unions or `.model.ts` const-enum catalogs,
- `.dto.ts` — API DTOs are `…-input.interface.ts` / `…-output.interface.ts`,
- `.page.ts` inside `src/app` — pages are components (`<page>.component.ts`); the `.page.ts` suffix is reserved for Playwright page objects under `e2e/support/pages/`,
- bare `types.ts` or `constants.ts` without a concept prefix — existing occurrences are transitional,
- `.pipe.ts` is currently unused; if a pipe is ever added it takes `.pipe.ts` inside its own folder under `shared/<concept>/ui/pipes/<name>/`.

### 9.3 Classes and symbols

**Components carry no `Component` suffix** (`addTypeToClassName: false` in `angular.json`). The class name states the semantic role, and the role suffix is meaningful:

- route pages always end in `Page`: `LoginPage`, `FacilityDetailPage`, `OrganizationMembersPage`,
- other roles use their own suffix: `…Form`, `…Table`, `…Dataview`, `…Dialog`, `…Drawer`, `…Panel`, `…Card`, `…Chart`, `…Layout`, `…Stepper`, `…Toolbar`,
- a generic widget may be a bare noun when no role suffix applies: `Board`, `Calendar`.

Other symbol families:

- directives keep the `Directive` suffix: `InfiniteScrollDirective`, `BoardCardDirective`,
- services end in `Service` (`OrganizationService`, `InterventionSyncService`, `HydraApiService`) — there is no `ApiService` suffix; the folder (`data-access/services/` vs `services/`) states the role,
- offline repositories end in `Repository`: `InterventionOutboxRepository`,
- stores end in `Store` (`OrganizationMembersStore`); the slice barrel re-exports the instance type as `<Name>StoreType`; a single-active-entity store takes the `Active` prefix (`ActiveOrganizationStore`, `ActiveFacilityStore`),
- guards and resolvers are `camelCase` functions typed by Angular's functional types: `authGuard: CanActivateFn`, `organizationResolver: ResolveFn<OrganizationOutput>`; a parameterized guard is a factory returning the function (`organizationPermissionGuard({ permissions, match })`),
- provider factories: `provide<Feature>Feature()` for feature bootstrap (`provideAuthFeature`, `provideOrganizationFeature`), `provide<Concern>()` for core concerns (`provideTheme`, `provideFeedback`),
- contribution factories and store features use the `with` prefix: `withOrganizationRail()`, `withNotificationBell()`, `withQueryState()`,
- ports pair an interface and a token: `interface <Name>Port` + `const <NAME>_PORT: InjectionToken<<Name>Port>`; layout slot tokens end in `_SLOT` (`RAIL_SLOT`, `PANEL_SLOT`); the configuration token is `ENV_CONFIG`,
- an `InjectionToken`'s string description repeats the constant name: `new InjectionToken<ThemePort>('THEME_PORT')`,
- slot contribution interfaces end in `Contribution`: `RailContribution`, `PanelContribution`.

### 9.4 Selectors

The application selector prefix is **`app`** (`angular.json`):

- element selectors: `app-` + the component **folder** name (not the class name): folder `organization-members/` → `app-organization-members`, even though the class is `OrganizationMembersPage`,
- attribute directive selectors: `appCamelCase`: `[appInfiniteScroll]`, `[appBoardCard]`.

No other prefix is permitted.

### 9.5 Routes

- the route file lives at the feature root, named after the feature folder: `<feature>.routes.ts`,
- the exported const is `SCREAMING_SNAKE` of the domain name + `_ROUTES`, typed `Routes`: `APP_ROUTES`, `AUTH_ROUTES`, `ORGANIZATION_ROUTES`; an entity sub-feature keeps the plural folder (`facilities/facilities.routes.ts`) but names the const after the domain concept (`FACILITY_ROUTES`),
- private intermediate consts are allowed and documented (`ORGANIZATION_SCOPED_ROUTES`),
- URL paths are lowercase kebab-case, plural for entity collections: `organizations`, `interventions`, `facilities`, `settings`,
- route params are `camelCase` id names: `:organizationId`, `:interventionId`, `:channelId`,
- lazy loading is the default: `loadChildren: () => import('./x.routes').then((m) => m.X_ROUTES)` for subtrees, `loadComponent` for leaf pages,
- `title` is either a `$localize` template with an explicit id (`` $localize`:@@route.members:Members` ``) or a `ResolveFn<string>` (`organizationTitleResolver`),
- breadcrumbs use `data: { breadcrumb: 'Interventions' }`, or `data: { breadcrumb: false }` to suppress a level,
- the global fallback is `{ path: '**', redirectTo: 'error/404' }`.

### 9.6 State

- slice folders are business or workflow names (`auth/`, `trusted-device/`, `organization-members/`), never technical buckets; do not repeat the feature name when the parent path already gives the context,
- the store file is `<store-name>.store.ts` at the slice root and its file name matches the slice folder name (slice `organization-members/` → `organization-members.store.ts`),
- inside a **single-store slice**, support files take short names because the folder gives the context: `models/state.interface.ts` and `events/events.ts`,
- inside a **multi-store slice**, support files are named after their store: `events/trusted-device.events.ts`, `models/trusted-device-state.interface.ts`,
- event group consts are `camelCase` + `StoreEvents`: `authStoreEvents`, `organizationMembersStoreEvents`; the `eventGroup` `source` is the Title Case human name of the store (`'Auth Store'`, `'Organization Members Store'`),
- event keys are `<verb>Succeeded` / `<verb>Failed`: `inviteSucceeded`, `removeMemberFailed`, `assignRoleSucceeded`,
- async call state fields are `<verb>CallState`: `listCallState`, `createCallState`, `deleteCallState`, `revokeCallState`, `mutationCallState`,
- `rxMethod` methods are bare verbs, without `on`/`handle`/`do` noise: `load`, `create`, `update`, `remove`, `revoke`, `assignRole`, `startCheckout`,
- `withEntities` collections are named in the singular: `withEntities({ entity: type<OrganizationMemberOutput>(), collection: 'member' })` → `memberEntities()`,
- the seed state constant is `INITIAL_STATE` (module-private),
- shared `signalStoreFeature` blocks live in the slice's `features/` folder as `<name>.feature.ts`; aggregate child stores are `slices/<metric>/<parent>-<metric>.store.ts`.

### 9.7 Component members and signals

- every member carries an explicit access modifier, an explicit type annotation, and `readonly` where possible: `protected readonly activeTab: WritableSignal<number> = signal(0);`,
- visibility follows consumption: `public` for `input()`/`output()` bindings, `protected` for anything the template reads (stores, signals, computed), `private` for injected collaborators the template never touches,
- computed booleans are `is…` / `has…` / `can…`: `isLoading`, `hasInlineMutationError`, `canManageRoles`,
- overlay visibility signals are `<thing>Visible`: `inviteDrawerVisible`, `quotaDialogVisible`,
- outputs are past-tense or noun events: `submitted`, `cancelled`, `confirmed`, `visibleChange`, `pageChange` — never imperative (`submit`) or `on`-prefixed (`onSubmit`),
- the `_` prefix is reserved for the private-by-convention state of `withQueryState` (`_queryStatus`, `_queryError`, `_queryData`); do not use it for component members,
- injected collaborators are named after their role, not their type shape: `private readonly feedback: FeedbackService = inject(FeedbackService);`.

### 9.8 Models and DTOs

- API DTO interfaces mirror the backend contract and end in `Input` (what the frontend sends) or `Output` (what the backend returns): `LoginInput`, `CreateFacilityInput`, `OrganizationMemberOutput`,
- domain enumerations are string-literal unions in `.type.ts` files, named after the concept (`InterventionStatus`), with literal values matching the exact backend strings (`'in_progress'`, not `'inProgress'`),
- const-enum catalogs pair a `SCREAMING_SNAKE` const object with its derived `PascalCase` type in one `.model.ts` file: `ORGANIZATION_PERMISSION` + `OrganizationPermissionName` (+ optional `ORGANIZATION_PERMISSION_NAMES` list),
- presentation registries live in a `<concept>-tag/` folder: `<concept>-tag-descriptor.interface.ts`, `<concept>-tag-kind.type.ts`, `<concept>-tag.util.ts` exposing `resolve<Concept>Tag(kind, value)` (section 10.10),
- Hydra transport types keep their established names: `HydraCollection`, `HydraItem`, `HydraView`, `ApiError`, `ConstraintViolation`.

### 9.9 Tests

- unit specs live in a `testing/` folder next to the subject, named `<subject-file-name>.spec.ts`: `state/auth/testing/auth.store.spec.ts`, `services/theme/testing/theme.service.spec.ts`,
- the top-level `describe()` is the exact symbol under test, no prefix or path: `describe('OrganizationMembersStore')`, `describe('LoginPage')`,
- shared test doubles take `.mock.ts` (and fixtures `.fixture.ts` if ever needed) inside a `testing/` folder,
- e2e specs live under `e2e/<area>/<scenario>.spec.ts` with kebab-case scenario names (`auth/login.spec.ts`, `interventions/intervention-offline-comment.spec.ts`),
- Playwright page objects are `e2e/support/pages/<name>.page.ts` exporting `class <Name>Page`; mocks and fixtures live in `e2e/support/mocks/` and `e2e/support/fixtures/`,
- e2e `test.describe()` uses a human-readable feature name and test titles are full sentences (`test('signs in and lands on the default organization workspace', …)`).

### 9.10 i18n ids and test hooks

- every user-visible string is `$localize` with an explicit id in a dotted `camelCase` namespace: `:@@route.members:`, `:@@org.members.loadError:`, `:@@inspectionStatus.draft:`,
- page and section root elements carry a kebab-case DOM `id` used as the e2e scoping hook: `id="login-page"`, `id="organization-overview"` (Playwright locates with `page.locator('#login-page input#email')`),
- `data-testid` attributes, where needed, are kebab-case and prefixed by the owning component: `account-mfa-confirm-code`, `account-password-request-submit`.

### 9.11 Known transitional deviations

The following minority patterns exist in the codebase, are **not** the target, and must not be copied into new code:

- a handful of specs sit flat next to their subject instead of in `testing/`,
- two account state slices use `<name>-state.model.ts` for store state instead of `state.interface.ts`,
- five features (`auth`, `account`, `error`, `maintenance`, `onboarding` — roughly a third of all pages) name page folders with a `-page` suffix (`ui/pages/login-page/`); the target is the bare screen name (`ui/pages/organization-members/`) — do not rename existing folders wholesale, and do not add the suffix to new pages,
- one state aggregate uses bare `utils/constants.ts` and `models/types.ts` file names without a concept prefix,
- a store file occasionally differs from its slice folder name (`state/organization-list/organization.store.ts`); the target is a matching pair.

## 10. Responsibility By File Type

The sections below follow the concern-oriented feature layout from section 8.3.

`ui/` owns presentation artifacts. `data-access/`, `models/`, and `state/` remain sibling concerns and must not be hidden inside UI folders.

### 10.1 `ui/pages/`

Pages are route entry containers inside a feature's `ui/` subtree.

They may:

- read route params and query params,
- inject stores and routing primitives,
- coordinate multiple child components,
- trigger navigation,
- orchestrate user flows.

Pages remain the orchestration layer inside UI. They coordinate stores, routing, and child components, but they do not replace feature state or `data-access/` services. If orchestration drifts into a child component and the page becomes a thin wrapper, move the orchestration back up.

### 10.2 `ui/components/` and the shared UI-folder rules

Feature components are reusable within the owning feature by default.

They live in `ui/components/` and may know feature models.

A feature component must not migrate into `shared` or a layout as a side effect of being rendered there: promotion out of the feature is an explicit ownership decision (section 6.4), not drift.

If a component is domain-aware, keep it in the owning feature even if it appears in a layout.

If a component becomes domain-free and reusable across features, move it to its own `shared/<concept>/` folder.

#### Canonical UI folder template

The structure below is the default convention for **any** UI artifact folder in the app — feature `ui/components/`, `ui/tables/`, `ui/dataviews/`, `ui/forms/`, `ui/dialogs/`, `ui/drawers/`, `shared/<concept>/ui/<kind>/`, and layout shell components. A shared concept applies it under its own `ui/`, where the admitted kinds are `components/`, `directives/`, and `pipes/` (section 8.5):

```text
ui/<kind>/
  <name>/
    index.ts
    <name>.component.ts
    <name>.component.html
    components/                           # optional nested Angular subcomponents
      <child-component>/
        index.ts
        <child-component>.component.ts
        <child-component>.component.html
    models/                               # optional local UI-only types, view models, form value models
    options/                              # optional static UI option sets (.constants.ts)
    constants/                            # optional local fixed runtime values (.constants.ts)
    utils/                                # optional pure helpers local to the group (.utils.ts)
    validators/                           # forms only — validators private to the form group
    testing/                              # specs and optional test-only fixtures
```

#### Shared UI structure rules

These rules apply to every folder kind listed above; the per-kind sections that follow only add what is specific to them.

- start with the smallest useful shape: a folder needs none of the optional buckets until the local area actually needs them,
- use `components/` for nested Angular subcomponents only; do not use vague names such as `parts/`,
- use `models/` for UI-facing local types and view models, not for feature transport contracts,
- use `options/` for static select, menu, filter, or step option sets used by the group,
- use `constants/` for local fixed runtime values; do not put `.constants.ts` files inside `utils/`,
- use `utils/` only for pure helpers private to the group,
- specs live in `testing/` (section 14.1),
- keep these nested folders private by default; external consumers import through the concern-level `ui/<kind>` barrel, not through deep implementation paths,
- if a local helper or type becomes broadly reusable across the feature, promote it to the appropriate feature-level concern instead of importing it through another group's private folder.

### 10.3 `ui/tables/` and `ui/dataviews/`

`ui/tables/` and `ui/dataviews/` both render the feature's entity collections as presentational components: they receive collection state through `input()` signals and emit paging, sorting, filtering, selection, and action events through `output()`, and neither injects feature stores nor calls data-access services. They differ only by the PrimeNG primitive and the rendering shape:

- `ui/tables/` — `p-table`-based **tabular grids**: columns, rows, row menus, inline sorting, and pagination. Use for data-dense administrative listings of one entity.
- `ui/dataviews/` — `p-dataview`-based **list/grid browsing surfaces** with a layout toggle and card-style items. Use for scannable, presentation-oriented collection browsing.

Local structure: the canonical UI folder template (section 10.2), where `components/` typically holds rows, cell renderers, toolbars, filter bars, and empty states, and `options/` holds static filter, sort, density, tab, or column option sets.

They may:

- render collection state,
- emit paging, sorting, filtering, selection, and action events,
- keep small UI-only state (an expanded row, a local layout toggle) that no other component needs to observe.

They must not:

- inject feature stores,
- call data-access services,
- own router synchronization,
- trigger hidden reload chains.

### 10.4 `ui/forms/`

`ui/forms/` contains typed forms for the owning feature.

Local structure: the canonical UI folder template (section 10.2), plus a `validators/` bucket for validators private to the form group. `models/` here typically holds local form value/data models (`login-form-values.model.ts`) and derived field-state types.

They may manage internal form state.

They must not own navigation or direct API access.

Cross-feature reusable validators belong in their own `shared/<concept>/` folder (for example `shared/match-fields/`); promote a form-local validator only when it is truly domain-agnostic and reused.

### 10.5 `ui/dialogs/` and `ui/drawers/`

`ui/dialogs/` contains presentational modal and overlay surfaces: creation dialogs, confirmation prompts, pickers, and other dismissable surfaces that host their own content.

`ui/drawers/` contains presentational side-anchored overlay panels: creation and edit forms that benefit from full height, and contextual side panels that keep the underlying page visible.

Both follow the same local structure (the canonical UI folder template, section 10.2), the same responsibilities, and the same constraints; only the shell differs — a centered modal versus a side-anchored panel.

They may:

- own the overlay shell (visibility, size or position, dismiss behavior),
- compose a `ui/forms/` form or other feature components as their body,
- forward open/close state through a `visible` input and `visibleChange` output, and emit domain events (`submitted`, `confirmed`, `cancelled`) for the parent to act on.

They must not:

- inject feature stores or call data-access services,
- own navigation, submission, or option-loading orchestration — that stays with the parent page,
- embed heavy form logic inline; keep it in a `ui/forms/` component they compose.

Choosing between the three surfaces:

- **dialog** — short confirmations, pickers, and compact single-purpose forms,
- **drawer** — forms tall enough to scroll inside a dialog, and contextual side panels that should keep the page context visible,
- **routed page** — the feature's primary or multi-step workflows; an overlay is for secondary, self-contained surfaces, never the core workflow.

### 10.6 `data-access/`

`data-access/` is the feature-owned transport boundary and remains a first-class sibling of `ui/`, `state/`, and `models/`.

Concrete business-facing API services belong in `features/<feature>/data-access/services`.

Examples:

- `features/auth/data-access/services/auth/auth.service.ts`
- `features/account/data-access/services/notification/notification.service.ts`
- `features/organization/features/facilities/data-access/services/facility/facility.service.ts`

Default structure:

```text
data-access/
  index.ts
  services/
    <concern>/
      <concern>.service.ts
      testing/
        <concern>.service.spec.ts
  adapters/               # optional
    <concern>.adapter.ts
```

Structure rules:

- keep `data-access/` root limited to role buckets and the public barrel,
- put injectable API classes under `data-access/services/`,
- give each service its own concern folder so the service, its `testing/` folder, and service-local helpers stay colocated,
- keep `data-access/index.ts` as the only stable external entry point for the feature's public services,
- keep `data-access/services/` and `data-access/adapters/` private by default; other folders import through `@features/<feature>/data-access`, not through implementation paths,
- the concern's `testing/` folder holds the spec (section 14.1) and any reusable service-local test helpers or fixtures.

Do not add new feature CRUD services to `core/api`.

Target rule:

Every feature API service must extend `HydraApiService` from `@core/api` (contract in section 11.3).

Services must not build `HttpParams` or `HttpHeaders` manually outside of `HydraApiService`. If extra behavior is needed, extend the protected methods.

Services return transport types only. They do not derive view models or apply presentation logic.

#### Data adapters — `data-access/adapters/`

A data adapter is a **pure function**, not a class. It normalizes a transport shape before it reaches the store.

```typescript
// organization-dashboard-trend.adapter.ts (excerpt)
// Pure function taking the raw transport type, returning a normalized value.
export function getDashboardTrendPointValue(point: OrganizationDashboardTrendSeriesPoint): number {
  return Number(point['count'] ?? point['total'] ?? point['value'] ?? 0);
}
```

Adapters must not inject services, must not use `inject()`, and must not produce side effects.

**When to use a data adapter:**

- the API returns a generic `Record<string, unknown>` structure and the code must probe dynamic keys,
- the same API field normalization is duplicated across two or more stores or components,
- the target type is a frontend-only structure that the service should not know about.

**When not to use one:**

- a simple rename of one field,
- derivation that belongs in a `computed` signal (e.g. formatting a date for display),
- a transformation that only happens in one `computed` signal and stays trivial there.

Placement rules:

- `data-access/adapters/<concern>.adapter.ts`, one file per concern,
- adapters are feature-internal by default. Do not expose them through a feature public API unless the adapter is intentionally part of a stable cross-feature contract,
- if multiple unrelated features need the same pure transformation, move it to its own `shared/<concept>/` folder instead of importing another feature's adapter,
- an adapter co-located with UI code (`ui/components/<component>/utils/`) is acceptable only when it transforms store or input data for one tightly coupled component group,
- do not scatter the same field-probing logic (`point['count'] ?? point['total'] ?? 0`) across multiple stores' `computed` blocks — that is exactly what the adapter centralizes.

### 10.7 `services/` (feature behavioral services)

`data-access/services/` is the data boundary: transport classes extending `HydraApiService`, plus the feature's local-persistence boundary (IndexedDB database services, repositories, outbox queues — e.g. `data-access/services/intervention-offline/`). Some feature-owned services are **neither** of those — they orchestrate workflows, wrap device/browser APIs, or coordinate offline sync. These live in a feature-root `services/` folder, one concern per subfolder, with the same `<concern>/index.ts` barrel convention as `data-access/services/`.

Use `services/` for a feature-owned service that is:

- an **orchestration/workflow** service composing stores, ports, and other services (publication, sync coordination, optimistic update, prefetch, offline lifecycle),
- a **device/browser API** wrapper (camera, QR/barcode scanner, image compression, PWA update),

and is therefore none of:

- a transport API service (those extend `HydraApiService` in `data-access/services/`),
- a persistence boundary (IndexedDB databases, repositories, and outboxes live in `data-access/services/<concern>-offline/`),
- a store (those live in `state/`),
- a pure, dependency-free function (those live in `utils/`).

Rules:

- a `services/` class may inject stores, ports, `data-access/` services, and other `services/`,
- it must not build `HttpParams`/`HttpHeaders` or perform business-data HTTP directly — go through a `data-access/` service,
- keep `data-access/services/` (transport) and `services/` (behavior) distinct; do not merge offline/sync/device services into the transport boundary.

Example: the interventions sub-feature keeps its offline-first orchestration (sync, publication, prefetch, QR scanning, photo compression, offline lifecycle) in `services/`, while `data-access/services/` owns the transport and IndexedDB boundaries (`intervention-offline/` holds the database service, workspace repository, and outbox repository).

### 10.8 `access/` (permission/access helpers)

A feature that owns an access/permission concern exposes ergonomic permission checks through an `access/services/<concern>/` helper service. The helper is a thin, read-only projection over the feature's access state (store), turning a raw granted-permission set into intent-revealing methods (`hasPermission`, `hasAnyPermission`, `hasAllPermissions`, `canAccess…`).

Rules:

- the helper reads the feature's own access store directly because it is owned and consumed inside the feature; external consumers go through the published port (for example `ORGANIZATION_MEMBER_ACCESS_PORT`) instead,
- it stays read-only against the store and side-effect free apart from an explicit `reload()`,
- it does not perform transport; the access payload is loaded by the owning store/guard.

Example: `features/organization/access/services/organization-permission` and `features/account/access/services/user-permission`.

### 10.9 `setup/` and `navigation/` (published boundary and shell config)

Two further feature-root concerns are sanctioned when a feature must publish a narrow, stable surface to the rest of the app:

- `setup/` — a **cross-feature setup boundary**: stable input DTOs plus a service that lets approved consumers (for example onboarding) create or configure the feature's primary resource without depending on internal subfeature contracts. It is a deliberate public surface, re-exported through the feature `index.ts`. Example: `features/organization/setup`.
- `navigation/` — feature-owned **navigation configuration** consumed by the shell: the navigation groups, items, and their required permissions for the feature, kept beside the feature that owns the routes rather than in the layout (`<feature>-navigation.config.ts`). Example: `features/organization/navigation`.

Create either folder only when the surface is genuinely published outside the owning area; otherwise keep navigation option sets in `options/` and one-off DTOs in `models/`.

### 10.10 `models/`

Feature-owned contracts and reusable feature types belong to the owning feature.

`models/` is the feature contract catalog. It does not own store state interfaces (those live in `state/`, section 10.11).

**A model is a type-only declaration.** It describes the _shape_ of data and is fully erased at compile time: `interface`, `type` alias, and literal-union enum. A file that emits runtime code is not a model and does not belong in `models/`:

- pure functions (mappers, formatters, type guards, resolvers) belong in `utils/`,
- fixed runtime values (defaults, limits, named keys, lookup maps) belong in `constants/`,
- UI option sets for selects, menus, and filters belong in `options/`.

Those three sibling folders, and the rule for how high each unit sits, are defined in section 10.13.

**Two runtime exceptions** are sanctioned — and only these two — because in both the type is _inseparable_ from a runtime value (it is derived from it or meaningless without it):

1. **Presentation registry**: a descriptor interface, its lookup maps, and its resolver stay together in one `<concept>-tag/` folder (see "Enum presentation registry" below).
2. **Const-enum catalog**: a value catalog declared `as const` whose literal-union type is derived from it via `typeof` (for example `ORGANIZATION_PERMISSION` and its derived `OrganizationPermissionName`). The const _is_ the enum and the type is mechanically derived, so the const and its derived type live together in `models/` and are exported as one unit (see "Const-enum catalogs" below).

Everything else that emits runtime code — including type guards, which are fully separable from the interface they narrow — leaves `models/`.

Default structure rules:

- `models/` is concept-first: the root of `models/` should contain only `index.ts` and concept folders,
- every model file belongs to a named concept folder such as `member/`, `role/`, `dashboard/`, `session/`, or `organization-entity/`,
- do not keep feature model files flat at `models/` root once the feature exposes more than a trivial single contract,
- do not repeat the feature name when the parent path already makes ownership obvious,
- add a domain prefix only when the folder name would otherwise be too generic or collision-prone in workspace-wide search, such as `organization-audit/`, `facility-type/`, `checklist-item/`, `equipment-attachment/`, or `equipment-tag/`,
- technical sub-buckets such as `api/`, `view-models/`, `filters/`, or `queries/` are allowed only inside a large concept slice when that slice has grown too broad.

#### File naming inside `models/`

One declaration per file. The file name states the concept, and the suffix states the kind (full suffix reference in section 9.2). A feature `models/` folder carries three suffixes:

| Suffix          | Kind                                                    | Example                                 |
| --------------- | ------------------------------------------------------- | --------------------------------------- |
| `.interface.ts` | an `interface` (API contract or view model shape)       | `intervention-output.interface.ts`      |
| `.type.ts`      | a `type` alias, including domain literal unions         | `intervention-status.type.ts`           |
| `.model.ts`     | a const-enum catalog and its derived type (exception 2) | `organization-permission-name.model.ts` |

Other runtime-bearing files belong in the sibling folders, **not** in `models/`: pure functions go to `utils/` (`.utils.ts`) and static `const` data to `constants/` (`.constants.ts`). Inside a presentation-registry concept folder (`<concept>-tag/`, exception 1), the resolver keeps the singular `.util.ts` suffix (`intervention-tag.util.ts`) and its descriptor maps stay co-located with the descriptor interface so the registry reads as one unit.

Rules:

- export object/resource shapes as `interface`, not `type`,
- export domain enumerations as `type` literal unions, never as TypeScript `enum`,
- keep the kind suffix on the file name so concept folders stay scannable,
- a concept folder normally holds only type-only files (the output interface and its status/priority unions) plus a barrel re-export through the feature `models/index.ts`; a `.util.ts` or `.model.ts` here marks one of the two sanctioned exceptions.

Example:

```text
models/
  index.ts
  organization-entity/
    create-organization-input.interface.ts
    organization-output.interface.ts
  member/
    add-organization-member-input.interface.ts
    organization-member-output.interface.ts
  dashboard/
    organization-dashboard-output.interface.ts
    organization-dashboard-query-options.interface.ts
  role/
    organization-permission-name.model.ts   # const-enum catalog (exception 2)
  intervention/
    intervention-output.interface.ts
    intervention-status.type.ts             # domain literal union (enum)
    intervention-priority.type.ts
  intervention-tag/                          # enum presentation registry (exception 1)
    intervention-tag-descriptor.interface.ts
    intervention-tag-kind.type.ts
    intervention-tag.util.ts
  organization-audit/
    audit-event-list-options.interface.ts
    audit-event-output.interface.ts
```

The `models/` folder contains four main kinds of types. Keep their ownership clear even when the folder is nested.

**API contracts**: types that directly mirror the backend JSON shape.

- input DTOs: what the frontend sends (`LoginInput`, `CreateFacilityInput`),
- output DTOs: what the backend returns (`OrganizationOutput`, `FacilityOutput`),
- query option types: filter and pagination parameters sent as query params.

API contracts extend `HydraItem` when they represent a backend resource.
API contracts are `readonly` and must not carry client-derived state.

**Enums and domain literal unions**: the fixed value sets of a business concept (`status`, `priority`, `type`, `severity`, `result`, `action`).

- model them as `type` string-literal unions, not TypeScript `enum`,
- one union per `.type.ts` file, named after the concept (`InterventionStatus`, `InterventionPriority`),
- the literal values must match the exact strings the backend sends (`'in_progress'`, not `'inProgress'`),
- co-locate the union in the same concept folder as the output interface that uses it (`intervention/intervention-status.type.ts` next to `intervention/intervention-output.interface.ts`),
- never hard-code a label, colour, or icon for an enum value inside a component; resolve presentation through the concept's tag registry (see below),
- do not duplicate a backend enum as a frontend `enum` plus a union; the union is the single source of truth.

**Feature view models**: types that exist only on the frontend.

- summary metrics, chart datasets, derived display objects,
- do not extend `HydraItem`,
- live in `models/` only when they are shared across multiple components inside the feature,
- if a view model is private to one store, define it locally in that store's slice.

**List and filter option types**: pagination requests, filter parameters, and query builders.

Store state interface types belong in `state/` next to the owning store or inside the owning state slice. They are not part of `models/`.

#### Enum presentation registry

How an enum value renders (its human label, its severity colour, its icon) is presentation data, not transport data. It does not belong in the API contract, scattered across components, or in a separate `presentation/` layer. It belongs to one registry living in the owning feature's `models/`, in a `<concept>-tag/` folder.

A registry exposes:

- a descriptor interface — `{ label; severity; icon }` (`<concept>-tag-descriptor.interface.ts`),
- a discriminator union over every enum family it covers (`<concept>-tag-kind.type.ts`),
- a pure resolver `resolve<Concept>Tag(kind, value)` returning the descriptor, with a graceful fallback for unknown values (`<concept>-tag.util.ts`),
- optional severity-to-class helpers for icon colour.

The registry is the single place that maps a raw enum value to how it looks. Components consume it; they never branch on enum values themselves.

```text
models/intervention-tag/
  intervention-tag-descriptor.interface.ts   # { label; severity; icon }
  intervention-tag-kind.type.ts              # 'priority' | 'status' | 'type' | ...
  intervention-tag-severity.type.ts
  intervention-tag.util.ts                   # resolveInterventionTag(kind, value)
```

Rendering style is owned by small presentational components in `ui/components/`, not by the registry — the registry returns data only:

- a **badge** component for tables, panels, and detail views (a neutral pill where only the icon carries colour),
- a **select-option** component for `p-select` items (bare icon + label, no pill).

To add or change a value, edit only the descriptor map in `<concept>-tag.util.ts`; every consumer follows. A new enum family gets a new map plus an entry in the `*TagKind` union. Re-export the descriptor interface, the kind type, and the resolver through the feature `models/index.ts`.

Do not centralize feature enum registries under `core/` or `shared/`. An enum registry knows business values, so it is feature-owned. Only a genuinely cross-feature enum (consumed unchanged by several features) is shared, and then through that owning feature's public API, not by copying the map.

#### Const-enum catalogs

Some enumerations are backed by a runtime value catalog rather than a hand-written union — the **const-enum** pattern: a `const … as const` object (or array) is the source of truth, and the literal-union type is _derived_ from it with `typeof`. The permission catalogs are the canonical case:

```typescript
// models/role/organization-permission-name.model.ts
export const ORGANIZATION_PERMISSION = {
  ROLES_READ: 'roles.read',
  // …
} as const;

export type OrganizationPermissionName =
  (typeof ORGANIZATION_PERMISSION)[keyof typeof ORGANIZATION_PERMISSION];

export const ORGANIZATION_PERMISSION_NAMES: ReadonlyArray<OrganizationPermissionName> =
  Object.values(ORGANIZATION_PERMISSION);
```

Because the type is computed from the value, the two cannot be separated cleanly, and consumers almost always use the const (`ORGANIZATION_PERMISSION.ROLES_READ`) and the type (`OrganizationPermissionName`) together. So the whole catalog — const, derived type, and the derived name list — stays in one `.model.ts` file in `models/` and is exported as a single unit through the feature `models/index.ts` barrel. Together with the presentation-registry maps above, this is one of the only two cases where runtime values live in `models/`.

Distinguish it from a hand-written union with a parallel runtime list: when the `type` is written by hand and a separate `const` array merely _enumerates_ its members (the two are independent), they are **not** a const-enum — the union stays in `models/` and the array moves to `constants/` (section 10.13).

Do not centralize feature model catalogs under `core/api/models`.

`core/api/models` is reserved for truly shared, app-wide transport types:

- Hydra envelope types (`HydraCollection`, `HydraItem`, `HydraView`),
- `ApiError` (RFC 7807 problem details) and `ConstraintViolation`.

A transport model owned by a single core concern lives in that concern's own
`models/` instead (for example Mercure subscription types in `core/mercure/models`).

### 10.11 `state/`

The `state/` folder owns feature stores, store-local helpers, store events, and store state interfaces. This section is the complete store standard: structure, async call state, store templates, scoping, collections, events, and SSR handoff.

Store location follows business ownership, not provider scope.

If a store represents organization state, it belongs to `features/organization/state` even if it is root-provided.

Only truly app-wide state or shared store infrastructure belongs outside feature state — in practice, only `core/request-state` (the CallState primitives and `withQueryState`) qualifies today.

#### Slice structure

Default structure rules:

- `state/` is slice-first: the root of `state/` should contain `index.ts` and state slice folders,
- each store or closely related store pair gets its own slice folder even when the slice is small,
- slice names are business or workflow names, not technical buckets (naming rules in section 9.6),
- every slice follows one uniform structure and only omits folders that are not needed,
- `models/` contains slice-local state interfaces and slice-local types,
- `events/` contains slice-local event groups,
- `utils/` contains pure helpers private to the slice,
- `features/` is reserved for shared `signalStoreFeature(...)` building blocks when the slice needs them,
- `testing/` contains the slice's specs,
- the store file stays at the slice root; supporting files move into the optional subfolders above instead of staying flat,
- optional support subfolders expose their own local `index.ts` barrel when imported from the slice root or sibling subfolders,
- every slice exposes a local `index.ts` barrel; the feature-level `state/index.ts` re-exports **only** the slices that are part of the feature's public surface (section 13.3),
- when a slice grows into a parent state domain with its own root store and multiple child slices, switch it to the aggregate-slice layout instead of mixing child slices and support files flat at the same level,
- when one store depends on another slice, cross-slice imports stay relative only inside the same `state/` concern; all wider consumers go through `state/index.ts`.

Example:

```text
state/
  index.ts
  auth/
    index.ts
    events/
      events.ts
      index.ts
    models/
      state.interface.ts
      index.ts
    auth.store.ts
    testing/
      auth.store.spec.ts
  session/
    index.ts
    events/
      events.ts
      index.ts
    models/
      state.interface.ts
      index.ts
    session.store.ts
  trusted-device/               # multi-store slice: files named after their store
    index.ts
    events/
      trusted-device.events.ts
      active-trusted-device.events.ts
      index.ts
    models/
      trusted-device-state.interface.ts
      active-trusted-device-state.interface.ts
      index.ts
    trusted-device.store.ts
    active-trusted-device.store.ts
```

Aggregate slice example:

```text
state/
  organization-dashboard/
    index.ts
    organization-dashboard.store.ts
    slices/
      overview-trend/
        organization-dashboard-overview-trend.store.ts
      asset-growth/
      inspections-trend/
    features/
      organization-dashboard-filter.feature.ts
    models/
    utils/
    testing/                                    # optional
```

Aggregate slice rules:

- use the aggregate layout only when a slice owns both a parent store and multiple related child slices,
- aggregate slices still follow the same uniform idea: keep the root store at the slice root and add only the optional support folders the domain needs,
- `slices/` contains child state slices only; child slices also expose their own local `index.ts` barrels,
- `features/` contains shared `signalStoreFeature(...)` building blocks and state-composition helpers,
- `models/` contains types shared across multiple child slices in the same aggregate state domain,
- `utils/` contains pure helpers private to the aggregate state domain (fixed values go to a local `constants/`),
- `events/` is optional and should exist only if the aggregate root store exposes aggregate-level events,
- store-specific state interfaces, events, and local helpers stay inside the owning child slice until they are truly shared.

When `state/` is split, `state/index.ts` may re-export the primary stores or event groups that other layers are allowed to consume. Do not re-export every private helper, every local event file, or every leaf store by default. Internal-only stores may be imported directly from their slice only inside the owning feature.

#### Async call state

Every async action must expose explicit call state. The retired `Operation<TData, TError>` type and its `createIdleOperation` / `createLoadingOperation` / `createSuccessOperation` / `createErrorOperation` constructors must not appear in new code.

**Import from `@core/request-state`:**

```typescript
import {
  idleCallState,
  pendingCallState,
  successCallState,
  errorCallState,
  toStoreError,
  toStoreFailureEventPayload,
  type CallState,
  type StoreError,
  type StoreFailureEventPayload,
} from '@core/request-state';
```

The four states:

| State     | Meaning                                                     | Factory                            |
| --------- | ----------------------------------------------------------- | ---------------------------------- |
| `idle`    | Nothing triggered yet.                                      | `idleCallState()`                  |
| `pending` | In-flight; may carry previous cached data.                  | `pendingCallState(previous?)`      |
| `success` | Completed successfully with typed payload.                  | `successCallState(data)`           |
| `error`   | Failed; normalized error attached, may carry previous data. | `errorCallState(error, previous?)` |

Error normalization is always done with `toStoreError(unknown)`, which:

- detects `ApiError` (RFC 7807) and wraps it preserving `status`, `type`, `title`, `detail`,
- detects `ConstraintViolation` and wraps accordingly,
- falls back to a generic `StoreError` for any other thrown value.

Never pass a raw `HttpErrorResponse` or `unknown` to `errorCallState`: always call `toStoreError(err)` first.

Read call state with the guards `isCallPending`, `isCallSuccess`, `isCallError`.

**Two patterns for async state, chosen by store shape:**

**Pattern 1 — Named `CallState` fields** (stores with multiple calls: CRUD, multi-command workflows).

Declare one `CallState` field per call in the state interface (`<verb>CallState`, section 9.6):

```typescript
interface UsersState {
  createCallState: CallState<UserOutput>;
  updateCallState: CallState;
  deleteCallState: CallState;
  listCallState: CallState;
}

const INITIAL_STATE: UsersState = {
  createCallState: idleCallState(),
  updateCallState: idleCallState(),
  deleteCallState: idleCallState(),
  listCallState: idleCallState(),
};
```

Drive transitions with `patchState` and the factory functions.

**Pattern 2 — `withQueryState` feature** (stores with exactly ONE primary query concern).

Use the custom NgRx SignalStore feature for simple single-resource or chart-data stores; it provides `isQueryLoading`, `isQueryLoaded`, `queryData`, `queryError` over private `_query*` state, driven with `setPendingQuery()` / `setSuccessQuery(data)` / `setErrorQuery(error)`.

Rules:

- do not use ad-hoc `boolean` flags when a `CallState` field already covers the same cases,
- do not use `rxResource` / `httpResource` as the store standard — Angular marks `resource` as experimental. Use `rxMethod` + `tapResponse` for all store-level fetches,
- `withQueryState` is for stores with ONE query. For multi-call stores, use named `CallState` fields.

#### Store structure pattern (NgRx SignalStore)

**Multi-action/workflow stores** (CRUD, multiple concurrent async operations):

```typescript
// state/<slice>/models/state.interface.ts
export interface FeatureState {
  createCallState: CallState<FeatureOutput>;
  listCallState: CallState<FeatureOutput[]>;
}

const INITIAL_STATE: FeatureState = {
  createCallState: idleCallState(),
  listCallState: idleCallState(),
};

// state/<slice>/<slice>.store.ts
export const FeatureStore = signalStore(
  withEntities({ entity: type<FeatureOutput>(), collection: 'entity' }), // optional
  withState<FeatureState>(INITIAL_STATE), // 1. raw state (CallState fields + filter state)

  withComputed((store) => ({
    // 2. derived signals
    isLoading: computed(() => isCallPending(store.listCallState())),
    items: computed(() => {
      const state = store.listCallState();
      return isCallSuccess(state) ? state.data : [];
    }),
  })),

  withMethods((store, service = inject(FeatureService), dispatcher = inject(Dispatcher)) => ({
    // 3. actions
    load: rxMethod<RequestOptions>(
      pipe(
        tap(() =>
          patchState(store, {
            listCallState: pendingCallState(store.listCallState().data ?? []),
          }),
        ),
        switchMap((options) =>
          service.getAll(options).pipe(
            tapResponse({
              next: (res) =>
                patchState(store, {
                  listCallState: successCallState(res.member),
                }),
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
    // 4. lifecycle wiring
    onInit(): void {
      store.load({});
    },
  })),
);
```

**Single-query stores** (dashboard cards, chart stores, simple resource loaders):

```typescript
export const TrendStore = signalStore(
  withQueryState<TrendResource>(), // 1. async query state
  withState<TrendFilterState>(INITIAL_FILTER_STATE), // 2. local filter/UI state
  withComputed((store) => ({
    /* 3. derived signals */
  })),
  withMethods((store, service = inject(FeatureService)) => ({
    // 4. actions
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
  withHooks((store) => ({
    /* 5. lifecycle wiring */
  })),
);
```

Rules:

- `withQueryState` and `withState` come before `withComputed` and `withMethods`; `withHooks` is last,
- `withMethods` receives injected services as default parameter values,
- `rxMethod` is the standard pattern for reactive data fetching triggered by signal changes,
- `tapResponse` from `@ngrx/operators` is the standard for handling async success/error in a `pipe`,
- `patchState` is the only mutation mechanism. Direct state assignment is forbidden,
- `INITIAL_STATE` is a typed constant; all call states start with `idleCallState()`.

#### Root-provided vs component-scoped stores

| Criterion                                         | Root-provided (`{ providedIn: 'root' }`) | Component-scoped (added to `providers:`) |
| ------------------------------------------------- | ---------------------------------------- | ---------------------------------------- |
| State persists across navigation                  | Yes                                      | No; destroyed with component             |
| Used by multiple unrelated features               | Yes                                      | No                                       |
| Data is user-session-tied and expensive to reload | Yes                                      | Not recommended                          |
| Data is route-specific and must reset             | Not recommended                          | Yes                                      |
| Used only within one route subtree                | Prefer scoped                            | Prefer scoped                            |

Do not use `{ providedIn: 'root' }` as a default for every store. Scoped stores are lower-risk and more predictable for route-specific data. Scoping does not change ownership (section 2.6).

#### Collection state pattern (withEntities)

Use `withEntities` when:

- the store holds a list of items identified by their `id`,
- the list is large enough that O(1) lookup by id has value,
- multiple places update or delete individual items.

```typescript
withEntities({ entity: type<EntityOutput>(), collection: 'entity' }),
```

This generates:

- `entityEntities`: `EntityOutput[]` — ordered array,
- `entityEntityMap`: `Record<EntityId, EntityOutput>` — O(1) id map,
- `entityIds`: `EntityId[]` — ordered id list.

Update primitives: `setAllEntities`, `addEntity`, `addEntities`, `updateEntity`, `removeEntity`, `removeEntities`.

Do not use `withEntities` for a single resource or a list that is always fully replaced at once and never needs `id`-based lookup — use a standard `CallState<T[]>` field instead. Do not maintain manual arrays for collections when `withEntities` covers the same case.

#### Store event pattern

When a store action has notable consequences for other layers (navigation, toast, sibling stores), emit a typed event instead of calling the consumer directly.

When to emit an event:

- an action failed and another part of the app must react (redirect, clear related state, show notification),
- an action succeeded and a sibling store must invalidate or refresh,
- a page or layout needs to react to a state change without polling the store signal.

Use `eventGroup` from `@ngrx/signals/events` (event and file naming in section 9.6):

```typescript
// state/auth/events/events.ts
export const authStoreEvents = eventGroup({
  source: 'Auth Store',
  events: {
    loginFailed: type<StoreFailureEventPayload>(),
    logoutSucceeded: type<void>(),
  },
});
```

Dispatch in the store via `inject(Dispatcher)`:

```typescript
withMethods((store, dispatcher = inject(Dispatcher)) => ({
  login: rxMethod<LoginInput>(
    pipe(
      tapResponse({
        next: () => {
          /* … */
        },
        error: (err) => {
          const storeError = toStoreError(err);
          patchState(store, { loginCallState: errorCallState(storeError) });
          dispatcher.dispatch(
            authStoreEvents.loginFailed(toStoreFailureEventPayload(storeError, 'Login failed')),
          );
        },
      }),
    ),
  ),
}));
```

Listen to events via `inject(EventDispatcher)` in a service, page, or in `withHooks` of a different store.

Events are store-owned. Pages and interceptors may listen; a store must not both emit and listen to the same event group instance — that creates circular logic.

#### SSR and TransferState integration

When a store performs an API call that runs during SSR and must not duplicate on the browser, use `makeStateKey` and `TransferState`:

```typescript
const TRANSFER_KEY = makeStateKey<SomePayload | null>('some-key');
```

Pattern:

1. On SSR: fetch, write result to `transferState.set(TRANSFER_KEY, result)`, apply to store.
2. On browser: read `transferState.get(TRANSFER_KEY, null)`, apply to store without fetching, then clear the key.
3. On browser without key (not SSR-rendered): fetch normally.

`TransferState` is a targeted SSR-to-browser handoff, not a general cache layer.

Use it only when all of the following are true:

1. the data is required for the initial SSR HTML of a route or shell,
2. the browser would otherwise refetch it immediately after hydration,
3. the payload is small and justified in the HTML,
4. the ownership stays obvious at one store or route boundary.

Whether to use a resolver, `TransferState`, or a browser-only load is a routing decision — the single decision order lives in section 12.5.

Rules:

- do not use `TransferState` as a default answer for authenticated requests,
- do not serialize large collections just to avoid one browser request,
- do not hydrate data for UI that is hidden on first paint,
- do not serialize secrets or bearer tokens,
- remove the key after browser consumption,
- do not rely on `TransferState` for data that changes per user session within the browser.

### 10.12 `http/` and `providers/`

Ownership follows the concern.

- application-wide guards and routing strategies belong to `core/routing/guards` and `core/routing/strategies`,
- global transport interceptors belong to `core/http/interceptors`,
- feature-specific guards, resolvers, and feature-scoped interceptors belong to the owning feature under `http/`,
- feature bootstrap providers belong to `<feature>.feature.ts` and `features/<feature>/providers`,
- app shell composition stays in `app.config.ts` and `app.routes.ts`.

Feature `http/` layout:

```text
features/<feature>/http/
  guards/                # optional — guards/<name>/<name>.guard.ts + testing/
  resolvers/             # optional — resolvers/<name>/<name>.resolver.ts + testing/
  interceptors/          # optional, feature-scoped only
```

Resolvers are for route-critical data only (section 12.2).

Guards answer access and redirection questions only.

Feature interceptors exist only when the behavior is owned by one feature and is wired through that feature's providers. Cross-application transport behavior stays in `core/http/interceptors`.

Providers must not be moved to `core` just because they are called from the app shell.

### 10.13 `utils/`, `constants/`, and `options/` (non-model unit folders)

`models/` is type-only apart from its two sanctioned exceptions (section 10.10). Everything else that emits runtime code lives in one of three sibling unit folders, chosen by what the unit _is_, then placed at the right height by usage locality (section 2.8). The same three folder names appear locally inside a component, dataview, or form group (section 10.2); this section makes them the standard at every scope.

| Folder       | Owns                                                            | File suffix     | Examples                                          |
| ------------ | --------------------------------------------------------------- | --------------- | ------------------------------------------------- |
| `utils/`     | pure, stateless functions over models and primitives            | `.utils.ts`     | `api-date-time.utils.ts`, `map-facility.utils.ts` |
| `constants/` | fixed runtime values: defaults, limits, named keys, lookup maps | `.constants.ts` | `pagination-defaults.constants.ts`                |
| `options/`   | UI option sets for `p-select`, menus, and filters               | `.constants.ts` | `facility-type-options.constants.ts`              |

The file inside a `utils/` folder takes the plural `.utils.ts` suffix, matching the folder name. A pure helper that stays co-located in a `models/` registry concept folder keeps the singular `.util.ts` (for example `intervention-tag.util.ts`); the suffix follows where the file lives.

Shared rules:

- **one declaration per file**, named after its purpose, with a barrel `index.ts` that is the only public entry point,
- `utils/` functions are pure: no Angular DI, no HTTP, no store access, no side effects — anything that needs DI is a service (`data-access/` or `services/`) or a store helper (`state/`),
- `constants/` holds data, not behavior; if a constant needs a function to be useful, the function lives in `utils/`. Do not park `.constants.ts` files inside a `utils/` folder,
- `options/` is for presentation-layer choice lists; it never holds transport defaults (those are `constants/`),
- none of these folders holds a `type` or `interface` declaration — those are models and belong in `models/` (a util may _import_ the types it operates on).

Placement (apply section 2.8):

- used by **one** component, dataview, or form → keep it in that group's local `utils/` · `constants/` · `options/` folder,
- used by **several** units of one feature → lift to the feature-level `features/<feature>/utils` · `constants` · `options`,
- used by **several** features and domain-agnostic → its own `shared/<concept>/` folder (section 8.5),
- **app-wide infrastructure** → `core/` (for example `core/request-state` utilities).

Feature-level layout:

```text
features/<feature>/
  models/        # type-only (+ the two sanctioned exceptions)
  utils/         # pure functions
    index.ts
    api-date-time.utils.ts
  constants/     # fixed runtime values and lookup maps
    index.ts
    pagination-defaults.constants.ts
  options/       # UI option sets for selects, menus, filters
    index.ts
    facility-type-options.constants.ts
```

A unit stays where it is until a consumer in a higher scope actually appears; only then is it lifted, and only as far as the shared scope requires. Outside code never reaches into a unit's local folder — it imports the lifted unit through the public barrel (section 13.4).

## 11. HTTP Transport Architecture

This section documents the precise layering of HTTP concerns in the application and defines the contract each layer must fulfill.

### 11.1 Layer overview

```text
Browser / Node.js
  └── Angular HttpClient
        └── Interceptor pipeline (assembled in app.config.ts)
              ├── ssr-cookie-forward  — core/http/interceptors — forwards browser cookies on server-side requests
              ├── auth                — features/auth/http/interceptors — injects Bearer token on non-public endpoints
              └── unauthorized        — features/auth/http/interceptors — redirects on 401, clears session
        └── HydraApiService (core/api)
              └── Feature API services (features/<feature>/data-access)
                    └── Feature stores (features/<feature>/state)
```

Interceptor ownership follows section 10.12: cross-application transport behavior (`ssr-cookie-forward`) lives in `core/http/interceptors`; behavior owned by one feature (`auth`, `unauthorized`, `maintenance`) lives in that feature's `http/interceptors/`. All of them are registered together in `app.config.ts`.

Request headers and transport-level response handling are modified only inside these registered interceptors — never in services, stores, or components.

### 11.2 Interceptor responsibilities

Each interceptor has a single responsibility.

- `ssr-cookie-forward` (core-owned): copies browser-sent cookies (`Cookie` header) to outgoing server-side HTTP requests, enabling transparent session forwarding during SSR. No side effects on the browser.
- `auth` (owned by `features/auth`): injects the `Authorization: Bearer <token>` header on all requests whose URL does not match the public endpoints list. Does not perform refresh logic.
- `unauthorized` (owned by `features/auth`): catches `401 Unauthorized` responses and triggers a session invalidation and redirect. Does not retry requests.

### 11.3 HydraApiService contract

`HydraApiService` is the only class that constructs HTTP calls for business data.

`HydraApiService` provides:

- `getCollection<T>()` — returns `Observable<HydraCollection<T>>`,
- `getOne<T>()` — returns `Observable<T>`,
- `post<TInput, TOutput>()`, `put<TInput, TOutput>()`, `patch<TInput, TOutput>()`, `delete()`,
- `buildUrl(path, id?)`, `buildParams(options?)`, `buildHeaders()` for lower-level assembly,
- automatic `withCredentials: true` and `Content-Type: application/ld+json`,
- centralized error handling via `catchError(this.handleError)`.

Rules:

- all feature API services must extend `HydraApiService`,
- services must not inject `HttpClient` directly,
- services return `Observable<T>`. They never subscribe internally, never `catch`, never transform to view models,
- errors propagate without interception to the store layer, which handles them via `tapResponse`,
- URL construction uses `buildUrl(path, id?)` and `buildParams(options?)`,
- the base content type is `application/ld+json`. Do not override it unless the endpoint explicitly requires it (e.g., file uploads use `multipart/form-data`).

### 11.4 SSR fetch strategy

Authenticated SSR data must not be treated uniformly. The decision order for how a given piece of data reaches the first render — resolver + store, `TransferState`, or browser-only load — is defined once in section 12.5.

At the transport level the rule is: do not expand `TransferState` to every authenticated list. If the UI can tolerate a client-side skeleton or an on-open fetch, prefer that over serializing extra payload into the HTML.

### 11.5 API error contract

The backend follows RFC 7807 Problem Details for error responses.

```typescript
interface ApiError {
  readonly '@id': string;
  readonly '@type': string;
  readonly status: number;
  readonly type: string;
  readonly title: string;
  readonly detail?: string;
  readonly instance?: string;
}
```

Use `isApiError(error)` to narrow an `unknown` to `ApiError` before reading its fields.

For validation failures (400 with constraint violations), use `isConstraintViolation(error)` and `ConstraintViolation` to access field-level errors.

Never access `.status`, `.title`, or `.detail` on an `unknown` error without first calling a type guard.

### 11.6 Error flow across layers

```text
HttpClient error (HttpErrorResponse)
  → interceptors (unauthorized 401 → redirect)
  → service Observable propagates the error
  → store rxMethod catches in tapResponse.error
  → toStoreError(err) normalizes to StoreError
  → patchState writes errorCallState(storeError) into the CallState field
  → page's computed reads: isCallError(store.<call>CallState())
  → page decides UI reaction (toast, inline error, retry)
```

No layer skips a step. A page must not read raw `HttpErrorResponse` from a service; it reads the normalized `StoreError` through the store's `CallState` signal (section 10.11).

### 11.7 Hydra transport model

Collection responses from the API follow the Hydra/JSON-LD envelope. The backend (API Platform 4) uses the **unprefixed** Hydra keys:

```typescript
interface HydraCollection<T> {
  readonly member: T[];
  readonly totalItems: number;
  readonly view?: HydraView;
}
```

Use `getCollection<T>()` when the endpoint returns a Hydra collection.
Use `getOne<T>()` when the endpoint returns a single resource.

Stores that need pagination must read `view` and `totalItems` from the collection response. Do not reintroduce the legacy `hydra:`-prefixed keys.

## 12. Routing, SSR, and Hydration

### 12.1 Route ownership

- `app.routes.ts` owns top-level layout selection and feature entry points; `app.routes.server.ts` owns server rendering modes,
- each feature owns its own route tree (`<feature>.routes.ts`, naming in section 9.5),
- nested features own nested routes only when ownership is actually nested,
- lazy loading (`loadChildren` / `loadComponent`) is the default for feature entry points.

### 12.2 Resolver responsibility

Resolvers are for data that must exist before route activation.

Good resolver use cases:

- active route context,
- permission-dependent entity context,
- page title or breadcrumb context derived from the route entity,
- blocking data without which the route is invalid.

Bad resolver use cases:

- dashboard widgets,
- paginated lists,
- optional secondary data,
- data that can load after first paint without breaking the route.

### 12.3 Avoid duplicate fetches

If a resolver loads data, one of the following must be true:

- it seeds the owning store,
- it writes into transfer state,
- it is the only loading path for that route-critical data.

Fetching the same entity in both resolver and page initialization is an anti-pattern.

### 12.4 SSR behavior must be explicit

Every route-critical flow must define behavior for:

- browser navigation,
- per-request SSR,
- hydration,
- prerender or request-less server contexts.

Do not assume request-bound auth state exists in every server execution context.

### 12.5 SSR data loading decision order

This is the single decision order for how data reaches the first render. Sections 10.11 (store mechanics) and 11.4 (transport view) defer to it.

Use the smallest strategy that matches the UI need:

1. **Resolver + shared/root store** for route-critical content that the SSR HTML truly depends on.
2. **Explicit `TransferState`** only for first-render shell or page bootstrap data that would immediately duplicate after hydration — and only when the preconditions in section 10.11 hold (initial-HTML data, immediate refetch otherwise, small payload, one obvious owner).
3. **Browser-only lazy load** for secondary panels, tabs, dialogs, dropdown option lists, and other non-critical enrichments — load on first paint or on user action.

Secondary UI data (hidden tabs, dialogs, switchers, pickers, popovers) loads browser-only or on user action unless the feature's `FEATURE.md` says otherwise.

### 12.6 App initialization is for app-wide bootstrap only

App initializers are reserved for concerns that must be known before the app can safely continue.

Examples:

- auth and session restoration,
- runtime environment bootstrap,
- shell-level initialization.

Do not move feature page loading into global bootstrap.

## 13. Imports and Public APIs

### 13.1 Use aliases at architectural boundaries

The path aliases defined in `tsconfig.json` are:

| Alias       | Target             |
| ----------- | ------------------ |
| `@app`      | `src/app`          |
| `@core`     | `src/app/core`     |
| `@shared`   | `src/app/shared`   |
| `@layouts`  | `src/app/layouts`  |
| `@features` | `src/app/features` |
| `@env`      | `src/environments` |

Use path aliases for any import that crosses a feature, layer, or concern boundary.

Use relative imports only within a small local area such as one component folder, one state slice, or one tight file group inside the same concern.

Switch from relative imports to aliases as soon as the import crosses `ui/`, `state/`, `models/`, `data-access/`, `http/`, or feature root boundaries.

Do not add new aliases without updating this table and `tsconfig.json` together.

### 13.2 Every externally consumed folder exposes a public API

Externally consumed folders are explicit, not implicit.

Every folder meant to be imported from outside its own local area must expose an `index.ts` barrel.

Standard public API surfaces include:

- `features/<feature>/index.ts` for stable feature-level exports used by other features or layouts (tokens, port types, permission catalogs, provider factories, guards),
- `features/<feature>/ports/index.ts` (and each `ports/<port-name>/index.ts`) for external port consumers,
- `features/<feature>/setup/index.ts` and `features/<feature>/navigation/index.ts` for the published setup boundary and shell navigation config,
- `features/<feature>/http/guards/index.ts` and `features/<feature>/http/resolvers/index.ts` for guards/resolvers intentionally consumed outside the local HTTP slice,
- `features/<feature>/http/interceptors/index.ts` when a feature intentionally exposes feature-scoped interceptors,
- `features/<feature>/ui/components/index.ts` for feature widgets consumed outside their own local folder,
- `features/<feature>/ui/tables/index.ts` and `features/<feature>/ui/dataviews/index.ts` when a collection surface is consumed outside its own local folder,
- `features/<feature>/ui/forms/index.ts`, `features/<feature>/ui/dialogs/index.ts`, and `features/<feature>/ui/drawers/index.ts` when those surfaces are reused across multiple pages inside the feature,
- `features/<feature>/data-access/index.ts` for transport services intentionally consumed outside their own local area,
- `features/<feature>/services/index.ts` and `features/<feature>/access/index.ts` for behavioral and access-helper services consumed outside their own local area,
- `features/<feature>/models/index.ts` for feature contracts and reusable feature types intentionally consumed outside one local model slice,
- `features/<feature>/state/index.ts` when stores or event groups are intentionally consumed outside their own state slice,
- `core/<concern>/index.ts` for each app-wide infrastructure concern (`@core/api`, `@core/request-state`, `@core/theme`, `@core/cookie`, …),
- `shared/<concept>/index.ts` for each shared concept (`@shared/tag`, `@shared/empty-state`, `@shared/calendar`, …) — `shared` has no root barrel and no aggregate kind barrel (section 8.5).

For core concerns, the concern barrel is the only entry point: outside code never imports a concern's `services/`, `models/`, `utils/`, `features/`, or `ports/` implementation files directly. Two deep buckets are sanctioned as public: `@core/api/models` (shared transport types) and `@core/api/utils` (transport guards).

Internal-only folders do not require or deserve a public barrel by default:

- `features/<feature>/data-access/services/`,
- `features/<feature>/data-access/adapters/`,
- `features/<feature>/ui/pages/`,
- `state/` slices that are not part of the feature's public surface (each slice still has a local `index.ts` for feature-internal consumption — section 10.11),
- nested `utils/`, `testing/`, or helper folders local to one component or slice.

Examples:

- `@features/organization/ui/components`
- `@features/account/ui/components`
- `@shared/empty-state`

External consumers must target the narrowest stable public barrel, usually the concern-level barrel. Deep imports into another area's implementation files or private folders are forbidden.

### 13.3 Barrels are public surfaces, not dumping grounds

Barrels must export the intended public API only, as explicit named re-exports (`export { X } from …`, `export type { Y } from …`) — never `export *`.

They must not re-export every helper by default.

Concern-level barrels such as `ui/components`, `ui/forms`, `data-access`, `models`, `state`, `http/guards`, or `http/resolvers` are the preferred external entry points.

`data-access/index.ts` re-exports stable service classes only. It must not expose adapters, fixtures, or service-local helpers.

The feature root barrel should expose only the stable tokens meant for other features, layouts, or the app shell. It must not mirror the entire internal folder tree.

When `state/` is split, `state/index.ts` re-exports only the primary stores and events that are intentionally public to the rest of the feature or to approved consumers — typically the `Store` const, its `StoreType`, and the event group, per public slice.

Per-component `index.ts` files may exist for local organization, but cross-folder consumers still import through the concern-level barrel unless that component folder is itself the documented public entry point (documented meaning: listed in the owning `FEATURE.md`).

### 13.4 Do not create import shortcuts through the wrong layer

Anti-patterns:

- putting feature business services under `@core/api`,
- putting feature models under `@core/api/models`,
- putting domain-aware widgets under `shared/`,
- reintroducing type-first buckets **at the root of** `shared` (`shared/components`, `shared/utils`, `shared/models`, …) instead of one folder per concept (section 8.5) — the kind buckets inside a concept's own `ui/` (`<concept>/ui/components/`, `<concept>/ui/directives/`) are the sanctioned shape, not a violation,
- importing a component implementation file such as `@features/<feature>/ui/components/<name>/<name>.component` from outside its own local folder,
- importing another feature's `data-access/services/` folder as if it were a public API,
- importing another feature's `data-access/adapters/` folder as if it were a shared API,
- keeping compatibility shims only to preserve outdated import paths.

## 14. Testing and Documentation Expectations

### 14.1 Test the architectural boundary that the unit owns

What to test, per unit type:

- data-access services: contract mapping and transport behavior,
- stores: state transitions and orchestration,
- guards and resolvers: routing decisions,
- pages: orchestration and child interaction,
- presentational components and dataviews: rendering and outputs.

Where and how:

- unit specs live in a `testing/` folder beside the subject, named `<subject-file>.spec.ts` (naming in section 9.9); the `testing/` folder also hosts reusable local fixtures and `.mock.ts` doubles,
- run specs with `npx ng test --watch=false --include="src/app/<area>/**/*.spec.ts"` — never with bare `vitest`, which misses the project globals. `--include` is the **spec-discovery glob**, not a path filter: it must end in `*.spec.ts`. A directory glob such as `--include="src/app/shared/**"` makes the runner treat every `.html` and `.component.ts` under it as a test entry and fails with `No loader is configured for ".html" files`,
- the quality gate is `npm run quality` (format check, oxlint, tests, strict build); run the narrowest useful check first and widen as the blast radius grows,
- browser-level flows live in the Playwright suite under `e2e/` (`e2e/<area>/<scenario>.spec.ts`, page objects in `e2e/support/pages/`); use e2e for what unit specs cannot prove (visual, responsive, offline, multi-page flows).

### 14.2 Feature documentation — `FEATURE.md`

Each feature must include a `FEATURE.md` file at its root. Top-level features under `src/app/features/` always require one; nested business subfeatures require their own when they own routes, state, services, or domain workflow decisions.

This document is normative for the local feature boundary and must stay short — a few screens, not a file catalog.

A `FEATURE.md` must document:

- the feature purpose and ownership,
- its route entry points (routes file, public API, feature provider),
- its main stores and data-access services,
- any published ports or public APIs,
- cross-feature dependencies that are intentionally allowed,
- approved exceptions to this architecture document,
- the local invariants that reviewers must preserve.

Update triggers — a `FEATURE.md` must be updated in the same change that:

- adds or moves a route entry point,
- publishes or retires a port or public API,
- adds an approved cross-feature dependency,
- changes an invariant reviewers must preserve.

A `FEATURE.md` must not become a file catalog or duplicate the implementation line-by-line.

`core/README.md` plays the same role for the core boundary, and a layout with a published slot system documents it in its own `README.md`.

### 14.3 Architecture decisions must stay visible

When introducing a new pattern, update this document in the same change.

Do not add dependencies or new architectural patterns unless the task requires it and no existing pattern fits.

Do not let architecture drift appear silently through implementation. A deviation that is not recorded (in this document or the owning `FEATURE.md`) is a defect, not an exception.

### 14.4 Prefer meaningful documentation over mechanical comments

Document:

- public abstractions,
- non-obvious ownership decisions,
- SSR and routing caveats,
- reasons for approved exceptions.

Avoid comments that merely restate obvious types or code.

**Keep `@description` blocks concise.** The mandated JSDoc tags stay (see `CLAUDE.md`), but the prose is one or two sentences on purpose and any non-obvious behavior — not a line-by-line narration of the implementation. A `@description` that re-derives the whole method body, lists every branch, or restates what the signature and `@param`/`@returns`/`@type` tags already convey is noise: it rots when the code changes and buries the one caveat a reader actually needs. Say what and why, briefly; let the code say how.

## 15. Approved Patterns

The following patterns are approved for new work.

- a page injects stores, reads route state, and passes plain inputs and outputs to children,
- a feature resolver loads route-critical context and seeds the owning feature store,
- a layout keeps its slots, shell components, directives, and shell services in its own folder,
- a layout imports a feature-owned shell widget through the feature public API, or receives it through a slot contribution (`with<Thing>()`),
- a layout that needs behavioral data (user identity, notification count, organization context) injects the relevant port token, never the owning feature's concrete store directly,
- a feature-owned port is bound in the feature's provider using `{ provide: PORT_TOKEN, useExisting: ConcreteAdapter }`,
- a core-owned contract is bound in the `core/` provider that owns the concrete implementation,
- a shared component that needs infrastructure injects an owner-published contract, never a concrete `core/` service,
- global HTTP concerns remain in `core/http/interceptors`,
- a feature owns its own `data-access`, `state`, `models`, optional `http`, optional `ports`, optional `providers`, and optional `utils` / `constants` / `options` folders,
- a model stays type-only; pure functions live in `utils/`, fixed values in `constants/`, and UI option sets in `options/`, each placed at the lowest scope that covers all its consumers (sections 2.8 and 10.13),
- files, classes, selectors, tokens, and routes follow the naming conventions of section 9,
- async actions use `CallState` with `idleCallState` in initial state and `pendingCallState` / `successCallState` / `errorCallState` in methods,
- stores use `rxMethod` with `tapResponse` for reactive data loading,
- error normalization uses `toStoreError(err)` before calling `errorCallState`,
- entity collections use `withEntities` for O(1) id-based access,
- notable store transitions dispatch typed events via `eventGroup` and `Dispatcher`,
- imports target documented feature or concern public APIs instead of implementation files,
- pure adapter functions in `data-access/adapters/` normalize generic API payloads before they reach the store.

## 16. Anti-patterns

The following patterns must not be introduced in new code.

- adding new feature CRUD services under `core/api`,
- adding new feature model catalogs under `core/api/models`,
- loading the same entity in both resolver and page initialization,
- putting router synchronization or hidden reload logic inside a dataview,
- using `providedIn: 'root'` as a substitute for deciding ownership correctly,
- importing sibling feature internals through deep private paths,
- making `shared` depend on feature state, feature services, or feature domain models,
- putting domain data fetching inside layouts,
- moving a domain-aware widget into `shared` only because it is rendered from a shell,
- keeping compatibility re-exports under the wrong layer to avoid updating imports,
- a layout injecting a concrete feature store or feature service directly when a port can express the same contract,
- a store injecting a concrete service from another feature's `data-access/` when a port boundary is intended,
- placing a behavioral contract in a central technical dumping folder (a global `tokens/` or `ports/` bucket) when a clear owner exists,
- creating a port for a contract consumed only within a single feature; features may inject their own concrete services directly,
- declaring a TypeScript `enum` instead of a literal union or const-enum catalog,
- using ad-hoc `isLoading: boolean` flags instead of the `CallState` lifecycle,
- passing a raw `HttpErrorResponse` or `unknown` to `errorCallState` without calling `toStoreError` first,
- injecting `HttpClient` directly in a feature service instead of extending `HydraApiService`,
- importing a feature implementation file instead of a documented feature or concern public API,
- importing another feature's adapters as a reuse shortcut,
- scattering the same dynamic key-probing logic (e.g. `point['count'] ?? point['total'] ?? 0`) across multiple stores without a shared adapter function,
- placing adapter functions inside `computed` signals in a store,
- placing runtime code in `models/` — a pure function belongs in `utils/`, a fixed value or lookup map in `constants/`, a select option set in `options/` (the only exceptions are the presentation registry and the const-enum catalog, section 10.10),
- declaring a `type` or `interface` in `utils/`, `constants/`, or `options/` instead of in `models/`,
- hoisting a model, util, constant, or option to the feature (or `shared/`, or `core/`) before a second consumer exists, instead of keeping it local until usage requires lifting (section 2.8),
- reaching into another component's private `models/`, `utils/`, `constants/`, or `options/` folder instead of lifting the shared unit first,
- placing a spec next to its subject instead of in the sibling `testing/` folder,
- introducing a banned file suffix or naming pattern (section 9.2): `.module.ts`, `.enum.ts`, `.dto.ts`, `.page.ts` in `src/app`, bare `types.ts`/`constants.ts`.

## 17. Review Checklist

Before merging a change, verify the following.

Placement and ownership:

- Is the file placed in the layer that owns the concern?
- Does the dependency direction respect the layer model?
- Is business logic owned by a feature instead of being pushed into `core`?
- Is app-wide infrastructure kept out of feature folders?
- If the feature owns guards, resolvers, or feature-scoped interceptors, are they under `http/` instead of at feature root?
- If the feature owns stores, are they organized into named `state/` slices instead of a flat `state/` root?
- If the feature owns contracts or reusable feature types, are they organized into concept-first `models/` folders with prefixes only for overly generic names?
- Is `models/` type-only, with pure functions in `utils/`, fixed values in `constants/`, and UI option sets in `options/` (the two registry/catalog exceptions aside)?
- Is each model, util, constant, and option set placed at the lowest scope covering all its consumers, and kept local until a second consumer forces it up?
- If the file is rendered in a layout, is its ownership still correct?

Naming:

- Do file names, class names, selectors, tokens, and route consts follow section 9?
- Are specs in `testing/` folders named after their subject file?

Behavior and state:

- Does the page own orchestration instead of the dataview or child component?
- If a resolver exists, is it truly route-critical and free of duplicate fetches?
- If SSR is involved, is hydration behavior explicit and does the data path follow the decision order of section 12.5?
- Does every async action use `CallState` (`idleCallState`, `pendingCallState`, `successCallState`, `errorCallState`) instead of ad-hoc boolean flags?
- Is every store error normalized with `toStoreError(err)` before being stored?
- Does the feature API service extend `HydraApiService` instead of injecting `HttpClient` directly?
- If a generic API payload is consumed in multiple places, is there a shared adapter function?
- Is `withEntities` used for entity collections that need O(1) id-based access?
- If a notable action can affect sibling parts of the app, does it dispatch a typed event?

Contracts and imports:

- For cross-feature or cross-concern imports, are aliases and the narrowest public APIs used instead of deep private files or long relative paths?
- If a layout depends on behavioral data from a feature (identity, notifications, organization), does it inject a port instead of the concrete feature store?
- If a feature publishes a contract to external consumers, is that contract expressed as a port in `features/<feature>/ports/` and bound in the feature's provider?
- If a shared component needs infrastructure, does it inject a contract from the owning `core` concern instead of a concrete `core` service?
- Are new behavioral contracts placed with the owning feature or core concern rather than in a central dumping folder?

Process:

- Are new tests focused on the correct architectural boundary?
- If the code deviates from this document, is the exception explicit and recorded in the owning `FEATURE.md`?
- If the change alters ownership, public APIs, routes, or published ports, is the owning `FEATURE.md` updated in the same change?

## 18. Summary

The target architecture is:

- feature-first for business code,
- core-only for application-wide infrastructure,
- layouts as shells,
- shared as generic primitives,
- explicit ownership of state and API access,
- one naming standard for files, classes, selectors, tokens, routes, state, and tests (section 9),
- type-only `models/` with runtime code split into `utils/`, `constants/`, and `options/`,
- placement by usage locality — local first, lifted only when shared,
- explicit SSR and hydration rules with a single data-loading decision order,
- public APIs instead of deep imports.

When the current code and this document disagree, new work should move toward this document.
