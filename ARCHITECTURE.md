# Frontend Architecture

This document defines the target frontend architecture for `fireguard-web`.

It is normative.

- New code must follow this document.
- Refactors must move legacy code toward this document.
- Existing mismatches are transitional and must not be treated as precedent.

This file is intentionally opinionated. It defines ownership and dependency rules. It is not a catalog of every file that exists today.

## 1. What This Document Governs

This document governs:

- folder ownership and dependency direction,
- routing, layouts, guards, resolvers, and providers,
- state placement and store scoping,
- API access, HTTP infrastructure, SSR, and hydration,
- page, component, dataview, and form responsibilities,
- public APIs, aliases, and barrel usage,
- review expectations for architecture changes.

This document does not govern:

- visual design conventions,
- backend architecture,
- naming of backend business concepts,
- one-off migration mechanics beyond the transition rules in this file.

## 2. Reading Guide

- Target rule: mandatory for new code.
- Transitional rule: accepted only while migrating legacy areas.
- Anti-pattern: must not be introduced in new code.

## 2.1 Feature Documentation

Each feature must include a `FEATURE.md` file at its root.

This document is normative for the local feature boundary and must stay short.

A `FEATURE.md` must document:

- the feature purpose and ownership,
- its route entry points,
- its main stores and data-access services,
- any published ports or public APIs,
- cross-feature dependencies that are intentionally allowed,
- the local invariants that reviewers must preserve.

A `FEATURE.md` must not become a file catalog or duplicate the implementation line-by-line.

Top-level features under `src/app/features/` require a `FEATURE.md`.

Nested business subfeatures under another feature also require their own `FEATURE.md` when they own routes, state, services, or domain workflow decisions.

## 3. Core Ideas

### 3.1 Feature-first business ownership

Business code belongs to the feature that owns the workflow.

That includes:

- feature state,
- feature-owned models and contracts,
- feature data-access services,
- feature guards, resolvers, and providers,
- route entry pages,
- feature UI components.

`core` is not a fallback location for business code.

### 3.2 `core` is app-wide infrastructure only

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
the owning concern, usually `core/<concern>/ports/` or `features/<feature>/ports/`,
and keep the concrete implementation with that owner.

### 3.3 `shared` is generic and domain-agnostic

`shared` is for generic UI primitives and pure utilities.

Reused does not mean shared.

A component is `shared` only when it is generic by design and has no feature ownership.

Shared UI may depend on neutral contracts published by an owning concern, but it must not
import concrete `core` services directly.

### 3.4 Layouts compose shells, not workflows

Layouts own shell composition only.

Layouts may render feature-owned shell widgets when the shell needs domain-aware UI, but the layout must not become the owner of the underlying business workflow.

### 3.5 Pages orchestrate, child components render

Pages are route entry containers.

Pages may:

- read route params and query params,
- coordinate stores and services,
- trigger navigation,
- compose child components,
- decide orchestration and error handling.

Dataviews and reusable UI components must not hide orchestration.

### 3.6 Provider scope does not decide ownership

Whether something is root-provided, route-scoped, or component-scoped does not decide where it lives.

Ownership follows the concern.

Example:

`provideAuth()` is called from `app.config.ts`, but it is still owned by `features/auth` because it bootstraps auth behavior.

### 3.7 Rendering location does not decide ownership

A component can be rendered in a layout and still belong to a feature.

Examples:

- `NotificationBell` belongs to `features/account/ui/components` because it depends on account notifications.
- `OrganizationSwitcher` belongs to `features/organization/ui/components` because it depends on organization context.
- `TrendCard` and `MetricCard` belong to `shared/components` because they have no domain dependency — their inputs are plain scalars and generic types with no coupling to any feature model.

### 3.8 Usage locality decides placement

Every model, type, util, constant, and option set lives at the **lowest layer that covers all of its consumers**. Proximity to the consumer is the default; height in the architecture is earned only by shared usage.

The rule has two directions:

- **Start local.** A unit used by a single component lives inside that component's folder, not at the feature level. Do not pre-emptively hoist something to `features/<feature>/models` (or `utils`, `constants`, `options`) "in case" another consumer appears.
- **Lift only when shared, and only as far as needed.** When a second consumer appears, move the unit up to the lowest scope that contains both consumers — to the feature's own `models/` · `utils/` · `constants/` · `options/` when several components of one feature use it, to `shared/` when several features use it and it is domain-agnostic, to the owning feature's public API when several features use it and it is domain-bearing, and to `core/` only when it is app-wide infrastructure.

Two hard constraints keep this honest:

- **Never reach down.** Code outside a component must not import from that component's private `models/`, `utils/`, `constants/`, or `options/` folder. If an outside consumer needs it, lift it first; deep cross-imports are forbidden (see section 11.4).
- **A shared registry is not copied.** A domain-bearing unit consumed by another feature is re-exported through its owner's public API, never duplicated into the consumer.

This generalizes sections 3.6 and 3.7: just as provider scope and rendering location do not grant ownership, neither does convenience. The set of consumers — and nothing else — determines how high a unit sits.

## 4. Layer Model

The frontend is organized into five top-level responsibilities under `src/app`.

| Layer       | Owns                                                          | Must not own                                         |
| ----------- | ------------------------------------------------------------- | ---------------------------------------------------- |
| `app` shell | top-level composition via `app.routes.ts` and `app.config.ts` | feature business logic                               |
| `core`      | application-wide infrastructure                               | feature-specific workflows by default                |
| `layouts`   | shell composition and layout-local behavior                   | business workflows, feature stores injected directly |
| `features`  | owned business workflows end-to-end                           | global infrastructure and generic primitives         |
| `shared`    | generic, domain-agnostic primitives                           | business orchestration, feature state, API access    |

## 5. Dependency Direction

The allowed dependency direction is:

```text
app shell -> core, layouts, features, shared
layouts -> core, shared, features (through public APIs and published contracts)
features -> core, shared, owned nested features (through public APIs), explicitly approved sibling-feature public APIs
shared -> shared, owner-published contracts only
core -> core
```

Additional rules:

- `core` must never depend on `features`.
- `shared` must never depend on `features`, feature state, or domain services.
- `shared` may depend on neutral contracts published by `core` or a feature, but not on concrete `core` service implementations.
- contracts belong to the owner of the behavior, not to a central abstraction folder.
- layouts may import feature-owned shell widgets through documented feature public APIs, but they must not inject concrete feature stores or feature services directly.
- when a layout needs behavioral data from a feature (user identity, notifications, organization context), it must consume a stable port instead of injecting the owning feature's store.
- cross-feature dependencies are forbidden by default.
- a cross-feature dependency is acceptable only when one feature explicitly owns the business concern and exposes a stable port or documented public API for it.
- parent features and nested child features may depend on each other only through explicit public APIs; nested ownership does not justify private deep imports.

### 5.1 Published Contracts and Adapters

A **port** is a behavioral contract expressed as a TypeScript interface and an `InjectionToken`. It has no implementation. It isolates a consumer from a concrete class.

An **adapter** is the concrete class that fulfills a port. Adapters live in `core/` or `features/<feature>/data-access/` and are bound to their ports through feature providers.

#### Ownership-first contract placement

Contracts live beside the concern that owns the behavior.

Preferred locations:

- `features/<feature>/ports/` for business capabilities published outside the owning feature,
- `core/ports/<port-name>/` when app-wide infrastructure publishes a contract to `shared`, `layouts`, or the app shell,
- a top-level application contracts area only in the rare case where no stable owner exists.

In this codebase, the default target is owner-local contracts. A top-level `src/app/ports/` folder is transitional compatibility only and must not be treated as the default architecture target.

#### Feature-owned ports — `features/<feature>/ports/`

Use a feature-owned port when the behavioral contract is owned by one feature but intentionally consumed outside that feature by a layout, `shared`, `core`, or an approved sibling feature.

Good candidates:

- `features/auth/ports/session/` — consumed by auth-owned HTTP interceptors and infrastructure seams,
- `features/account/ports/user-identity/` — consumed by shell composition,
- `features/account/ports/notification-center/` — consumed by the shell sidebar,
- `features/organization/ports/organization-context/` — consumed by layout and sibling features.

Naming convention:

- `features/<feature>/ports/<port-name>/<port-name>.interface.ts`
- `features/<feature>/ports/<port-name>/<port-name>.token.ts`
- `features/<feature>/ports/<port-name>/index.ts`

Compatibility shims such as legacy `*.port.ts` files may exist temporarily during migration, but they are not the target structure.

#### Core-owned contracts

If infrastructure in `core/` publishes behavior to external consumers, place the contract under `core/ports/<port-name>/` and bind it from the owning core provider.

#### Placement rule

- Prefer an **owner-local contract** first.
- Prefer a **feature-owned port** when the contract represents a business capability published by a single owning feature.
- Prefer a **core-owned contract** when the contract represents app-wide infrastructure published by one core concern.
- Do not create a port for a contract that is consumed only within a single feature; use a direct injection there.
- Do not create a top-level global port unless no stable owner can be assigned.
- Do not create a contract for configuration tokens such as `ENV_CONFIG`. Configuration tokens are not behavioral ports.

#### Adapter and provider binding

- Concrete adapters (feature services, core services) implement the port interface.
- The provider that binds the port must live in the concern that owns the concrete implementation.
- Feature-owned ports are bound in `features/<feature>/providers/`.
- Core-owned contracts are bound in the relevant `core` provider (`provideTheme`, `provideSplashScreen`, and similar owner-local providers).
- The binding uses `{ provide: PORT_TOKEN, useExisting: ConcreteService }` to avoid double instantiation.

#### Current owner-local feature contracts

| Token                       | Interface                 | Feature                 | Bound by                                  | Consumers                                          |
| --------------------------- | ------------------------- | ----------------------- | ----------------------------------------- | -------------------------------------------------- |
| `AUTH_SESSION_PORT`         | `AuthSessionPort`         | `features/auth`         | `features/auth` via `provideAuth()`       | auth-owned HTTP interceptors, infrastructure seams |
| `USER_IDENTITY_PORT`        | `UserIdentityPort`        | `features/account`      | `features/account` via `provideAccount()` | layouts, shell widgets                             |
| `NOTIFICATION_CENTER_PORT`  | `NotificationCenterPort`  | `features/account`      | `features/account` via `provideAccount()` | layouts                                            |
| `ORGANIZATION_CONTEXT_PORT` | `OrganizationContextPort` | `features/organization` | `features/organization` via provider      | layouts, sibling features                          |

#### Current owner-local core contracts

| Token                | Interface          | Concern                       | Bound by                | Consumers |
| -------------------- | ------------------ | ----------------------------- | ----------------------- | --------- |
| `THEME_PORT`         | `ThemePort`        | `core/services/theme`         | `provideTheme()`        | shared UI |
| `SPLASH_SCREEN_PORT` | `SplashScreenPort` | `core/services/splash-screen` | `provideSplashScreen()` | shared UI |

If a dependency direction feels awkward, the structure is probably wrong.

## 6. Fast Placement Guide

Use the following decision order when creating a new file.

### 6.1 Does it know a business concept?

If it knows a domain concept such as organization, facility, equipment, inspection, account, session, notification, onboarding, or auth, it belongs to the owning feature.

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

Choose the folder owned by the strongest business invariant, not the folder that is easiest to import from.

## 7. Canonical Top-Level Structure

The target top-level structure is:

```text
src/app/
  app.component.ts
  app.config.ts
  app.routes.ts
  core/
  layouts/
  features/
  shared/
```

Only create folders when they are needed. Empty architectural buckets are noise.

Contracts should live with the owning concern by default.
`features/<feature>/ports/` holds feature-owned contracts intentionally published outside the owning feature.
`core/<concern>/ports/` holds app-wide infrastructure contracts intentionally published outside that core concern.

See section 5.1 for placement rules and taxonomies.

## 8. Canonical Folder Templates

The following templates define the default structure to create.

### 8.1 `core/` template

```text
core/
  config/
    environment/
  http/
    interceptors/
    errors/
    transfer-state/        # optional
  models/
    api/
    mercure/
  routing/
    guards/
    resolvers/
    strategies/
  services/
  stores/
    request-state/
  themes/
```

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

- `core/models` is reserved for truly shared transport models such as Hydra and Mercure contracts.
- `core/stores` is not a home for business stores. It is limited to shared store infrastructure such as async call state primitives (`CallState`, `withQueryState`, `toStoreError`).
- do not create `core/providers` by default. A provider lives in `core` only when it is truly infrastructure-owned and not feature-owned.

### 8.2 `layouts/` template

```text
layouts/<name>-layout/
  <name>-layout.component.ts
  <name>-layout.component.html
  <name>-layout.component.spec.ts
  directives/             # optional
  partials/               # optional
  services/               # optional
  index.ts
```

Target rule:

Each layout owns shell composition only.

Allowed in a layout:

- the layout component,
- layout-local directives,
- layout partials such as header or sidebar pieces,
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
  <feature>.routes.ts
  data-access/
    index.ts              # optional public API
    services/             # optional
      <concern>/          # optional
    adapters/             # optional
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
    dataviews/            # optional
    forms/                # optional
    dialogs/              # optional
    drawers/              # optional
  state/
    index.ts              # optional public API
    <slice>/
  models/                 # type-only: interfaces, type aliases, literal-union enums
    index.ts              # optional public API
    <concept>/
  utils/                  # optional — pure functions shared across the feature
    index.ts
  constants/              # optional — fixed runtime values shared across the feature
    index.ts
  options/                # optional — UI option sets shared across the feature
    index.ts
  providers/              # optional
  features/               # optional nested features
  index.ts                # optional public API
```

Target rule:

Each feature owns its business workflow end-to-end through a small set of stable concerns.

A feature may contain:

- route configuration,
- `data-access/` for transport-facing code, split into `services/` and optional `adapters/`,
- `http/` for feature-owned guards, resolvers, and rare feature-scoped interceptors,
- `ports/` for behavioral contracts intentionally published to layouts or approved sibling features,
- `ui/` for pages and feature-owned presentation code,
- `state/` for stores and store-local state types,
- `models/` for feature contracts and reusable feature types (type-only),
- `utils/`, `constants/`, and `options/` for pure functions, fixed runtime values, and UI option sets shared across the feature (section 9.9), created only when a unit outgrows a single component (section 3.8),
- feature-owned providers, responsible for binding the feature's ports to their concrete adapters,
- nested `features/` only when the child is a real ownership boundary.

Notes:

- `ui/` is the default home for `pages/`, `components/`, `dataviews/`, `forms/`, `dialogs/`, and `drawers/`; do not spread presentation folders beside `data-access/` and `state/`,
- `data-access/` root should stay small: keep the public barrel at the root, put injectable API classes under `data-access/services/`, and reserve `data-access/adapters/` for pure transformations,
- `ui/` is the target structure; legacy flat `pages/`, `components/`, `dataviews/`, `forms/`, `dialogs/`, and `drawers/` folders may remain only under the transition rules in section 15,
- if a feature owns guards, resolvers, or feature-scoped interceptors, they live under `http/`; do not place them at the feature root,
- keep empty concern folders absent; the template defines ownership boundaries, not mandatory boilerplate,
- create `ports/` only when a feature publishes behavioral contracts consumed by layouts or approved sibling features; do not create `ports/` for contracts consumed only within the feature,
- inside `ports/`, use one folder per published contract and split the interface from the token (`<port-name>.interface.ts` and `<port-name>.token.ts`),
- create `providers/` when a feature exposes bootstrap helpers or feature-owned providers; each provider is responsible for binding the feature's ports to their concrete adapters,
- create `ui/dataviews/` only for substantial list, grid, table, or browsing UIs,
- create `ui/dialogs/` only for modal/overlay surfaces (creation dialogs, confirmations, pickers) that host their own content; keep heavy form logic in a `ui/forms/` component the dialog composes,
- create `ui/drawers/` for side-anchored overlay panels (creation/edit forms, contextual side panels) that host their own content; same composition rule — keep heavy form logic in a `ui/forms/` component the drawer composes,
- create `features/` only when both URL structure and ownership are nested,
- keep feature internals colocated instead of centralizing them in `core`.

### 8.4 Nested feature template

Use a nested feature only when both the URL hierarchy and the ownership hierarchy are nested.

A child feature follows the same concern-oriented structure as a top-level feature.

```text
features/<parent>/features/<child>/
  <child>.routes.ts       # optional
  data-access/
    index.ts              # optional public API
    services/             # optional
      <concern>/          # optional
    adapters/             # optional
  http/                   # optional
    guards/               # optional
    resolvers/            # optional
    interceptors/         # optional, feature-scoped only
  ui/
    pages/                # optional
    components/           # optional
    dataviews/            # optional
    forms/                # optional
    dialogs/              # optional
    drawers/              # optional
  state/
    index.ts              # optional public API
    <slice>/
  models/                 # type-only: interfaces, type aliases, literal-union enums
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

```text
shared/
  components/
    index.ts
    <component>/
      index.ts
      <component>.component.ts
      <component>.component.html
      <component>.component.css        # optional
      components/                      # optional nested Angular subcomponents
      models/                          # optional local UI-only types and view models
      options/                         # optional static UI option sets
      utils/                           # optional pure helpers local to the component group
      testing/                         # optional test-only fixtures and helpers
  directives/
  validators/
  pipes/                  # optional
  models/                 # optional — generic, domain-agnostic type-only declarations
  utils/                  # optional — generic pure functions
  constants/              # optional — generic fixed runtime values
```

Target rule:

`shared` is for generic reuse with no business ownership. The same unit-folder taxonomy applies as in a feature (`models/` is type-only; `utils/`, `constants/`, `options/` hold runtime code — section 9.9), restricted to domain-agnostic units: anything that names a business concept does not belong in `shared`.

External consumers import shared UI through concern-level public APIs such as `@shared/components`, not through implementation files.

Allowed in `shared`:

- generic UI primitives,
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
- compatibility re-exports that mask real ownership.

If a shared component needs app-wide infrastructure, inject a contract from
the owning `core` concern instead of importing the concrete implementation.

If a component imports feature models, feature stores, or domain services, it is not shared.

The local component-folder structure defined later in section 9.2 also applies to `shared/components/`.

## 9. Responsibility By File Type

The sections below follow the concern-oriented feature layout from section 8.3.

`ui/` owns presentation artifacts. `data-access/`, `models/`, and `state/` remain sibling concerns and must not be hidden inside UI folders.

### 9.1 `ui/pages/`

Pages are route entry containers inside a feature's `ui/` subtree.

They may:

- read route params and query params,
- inject stores and routing primitives,
- coordinate multiple child components,
- trigger navigation,
- orchestrate user flows.

Pages must not be reduced to thin wrappers if orchestration actually lives inside child components.

Pages remain the orchestration layer inside UI. They coordinate stores, routing, and child components, but they do not replace feature state or `data-access/` services.

### 9.2 `ui/components/`

Feature components are reusable within the owning feature by default.

They live in `ui/components/` and may know feature models.

They must not silently become global building blocks.

If a component is domain-aware, keep it in the owning feature even if it appears in a layout.

If a component becomes domain-free and reusable across features, move it to `shared/components`.

The structure below is the default convention for any Angular component folder in the app, not only feature `ui/components/`.

Apply it equally to:

- `features/<feature>/ui/components/<component>/`,
- `shared/components/<component>/`,
- layout or shell component folders when they grow beyond a single file group.

Recommended local structure for a component folder:

```text
ui/components/
  <component-name>/
    index.ts
    <component-name>.component.ts
    <component-name>.component.html
    <component-name>.component.css        # optional
    components/                           # optional nested Angular subcomponents
      <child-component>/
        index.ts
        <child-component>.component.ts
        <child-component>.component.html
    models/                               # optional local UI-only types and view models
      index.ts                            # optional
      <name>.type.ts
    options/                              # optional static UI option sets
      index.ts                            # optional
      <name>.constants.ts
    utils/                                # optional pure helpers local to the component group
      index.ts                            # optional
      <name>.utils.ts
      <name>.constants.ts
    testing/                              # optional test-only fixtures and helpers
```

Structure rules:

- start with the smallest useful shape: a component folder does not need `components/`, `models/`, `options/`, `utils/`, or `testing/` until the local area actually needs them,
- use `components/` for nested Angular subcomponents only; do not use vague names such as `parts/`,
- use `models/` for UI-facing local types and view models, not for feature transport contracts,
- use `options/` for static select, menu, or filter option sets used by the component group,
- use `utils/` only for pure helpers that are private to the component group,
- keep these nested folders private by default; external consumers import through the concern-level `ui/components` barrel, not through deep implementation paths,
- if a nested helper becomes broadly reusable across the feature, promote it to the appropriate feature-level concern instead of importing it through another component's private folder.

### 9.3 `ui/dataviews/`

`ui/dataviews/` contains presentational browsing UIs for lists, tables, grids, and collection views.

The structure below is the default convention for any dataview folder in the app.

Recommended local structure for a dataview folder:

```text
ui/dataviews/
  <dataview-name>/
    index.ts
    <dataview-name>.component.ts
    <dataview-name>.component.html
    <dataview-name>.component.css        # optional
    components/                          # optional row, cell, toolbar, or empty-state subcomponents
      <child-component>/
        index.ts
        <child-component>.component.ts
        <child-component>.component.html
    models/                              # optional local view models and UI-facing row types
      index.ts                           # optional
      <name>.type.ts
    options/                             # optional static filters, tabs, sort options, or display options
      index.ts                           # optional
      <name>.constants.ts
    utils/                               # optional pure helpers local to the dataview group
      index.ts                           # optional
      <name>.utils.ts
      <name>.constants.ts
    testing/                             # optional test-only fixtures and helpers
```

They may:

- render collection state,
- emit paging, sorting, filtering, selection, and action events,
- keep small UI-only state.

They must not:

- inject feature stores,
- call data-access services,
- own router synchronization,
- trigger hidden reload chains.

Structure rules:

- start with the smallest useful shape; create `components/`, `models/`, `options/`, `utils/`, or `testing/` only when the dataview area actually needs them,
- use `components/` for nested Angular subcomponents such as table rows, cell renderers, toolbars, filter bars, or empty states,
- use `models/` for local row/view-model types used to shape rendering state, not for feature transport contracts,
- use `options/` for static filter, sort, density, tab, or column option sets used by the dataview group,
- use `utils/` only for pure helpers private to the dataview group,
- keep these nested folders private by default; external consumers import through the concern-level `ui/dataviews` barrel, not through deep implementation paths,
- if a dataview helper becomes broadly reusable across the feature, promote it to the appropriate feature-level concern instead of importing it through another dataview's private folder.

### 9.4 `ui/forms/`

`ui/forms/` contains typed forms for the owning feature.

The structure below is the default convention for any form folder in the app.

Recommended local structure for a form folder:

```text
ui/forms/
  <form-name>/
    index.ts
    <form-name>.component.ts
    <form-name>.component.html
    <form-name>.component.css            # optional
    components/                          # optional nested field groups, steps, or field widgets
      <child-component>/
        index.ts
        <child-component>.component.ts
        <child-component>.component.html
    models/                              # optional local form values, DTO mappers, or field-state types
      index.ts                           # optional
      <name>.type.ts
    options/                             # optional static select, radio, checkbox, or step option sets
      index.ts                           # optional
      <name>.constants.ts
    validators/                          # optional validators private to the form group
      index.ts                           # optional
      <name>.validator.ts
    utils/                               # optional pure helpers local to the form group
      index.ts                           # optional
      <name>.utils.ts
      <name>.constants.ts
    testing/                             # optional test-only fixtures and helpers
```

They may manage internal form state.

They must not own navigation or direct API access.

Cross-feature reusable validators belong in `shared/validators`.

Structure rules:

- start with the smallest useful shape; a form folder does not need `components/`, `models/`, `options/`, `validators/`, `utils/`, or `testing/` until the local form area actually needs them,
- use `components/` for nested Angular subcomponents such as field groups, repeatable rows, wizard steps, or form-specific controls,
- use `models/` for local form value types, derived field-state types, and view-models private to the form group,
- use `options/` for static select, radio, checkbox, or step option sets used by the form group,
- use `validators/` only for validators private to the form group; promote validators to `shared/validators` only when they are truly cross-feature reusable,
- use `utils/` only for pure helpers private to the form group,
- keep these nested folders private by default; external consumers import through the concern-level `ui/forms` barrel, not through deep implementation paths,
- if a form-local helper or type becomes broadly reusable across the feature, promote it to the appropriate feature-level concern instead of importing it through another form's private folder.

### 9.4.1 `ui/dialogs/`

`ui/dialogs/` contains presentational modal and overlay surfaces for the owning feature: creation dialogs, confirmation prompts, pickers, and other dismissable surfaces that host their own content.

The structure below is the default convention for any dialog folder in the app.

Recommended local structure for a dialog folder:

```text
ui/dialogs/
  <dialog-name>/
    index.ts
    <dialog-name>.component.ts
    <dialog-name>.component.html
    <dialog-name>.component.css          # optional
    components/                          # optional nested subcomponents
      <child-component>/
        index.ts
        <child-component>.component.ts
        <child-component>.component.html
    models/                             # optional local view models and UI-facing types
      index.ts                          # optional
      <name>.type.ts
    options/                            # optional static select, step, or action option sets
      index.ts                          # optional
      <name>.constants.ts
    utils/                              # optional pure helpers local to the dialog group
      index.ts                          # optional
      <name>.utils.ts
    testing/                            # optional test-only fixtures and helpers
```

They may:

- own the modal shell (visibility, size, dismiss behavior),
- compose a `ui/forms/` form or other feature components as their body,
- forward open/close state through `visible` input and `visibleChange` output, and emit domain events (`submitted`, `confirmed`, `cancelled`) for the parent to act on.

They must not:

- inject feature stores or call data-access services,
- own navigation, submission, or option-loading orchestration — that stays with the parent page,
- embed heavy form logic inline; keep it in a `ui/forms/` component the dialog composes.

Structure rules:

- start with the smallest useful shape; create `components/`, `models/`, `options/`, `utils/`, or `testing/` only when the dialog area actually needs them,
- keep the dialog presentational: the parent page provides data through inputs and reacts to outputs,
- keep these nested folders private by default; external consumers import through the concern-level `ui/dialogs` barrel, not through deep implementation paths,
- if a dialog-local helper or type becomes broadly reusable across the feature, promote it to the appropriate feature-level concern instead of importing it through another dialog's private folder.

### 9.4.2 `ui/drawers/`

`ui/drawers/` contains presentational side-anchored overlay panels for the owning feature: creation and edit forms that benefit from full height, and contextual side panels that keep the underlying page visible.

It follows the same local structure, responsibilities and constraints as `ui/dialogs/` (section 9.4.1); only the shell differs — a side drawer instead of a centered modal.

```text
ui/drawers/
  <drawer-name>/
    index.ts
    <drawer-name>.component.ts
    <drawer-name>.component.html
    <drawer-name>.component.css         # optional
    components/                         # optional nested subcomponents
    models/                             # optional local view models and UI-facing types
    options/                            # optional static option sets
    utils/                              # optional pure helpers local to the drawer group
    testing/                            # optional test-only fixtures and helpers
```

They may:

- own the drawer shell (visibility, position, size, dismiss behavior),
- compose a `ui/forms/` form or other feature components as their body,
- forward open/close state through `visible` input and `visibleChange` output, and emit domain events (`submitted`, `confirmed`, `cancelled`) for the parent to act on.

They must not:

- inject feature stores or call data-access services,
- own navigation, submission, or option-loading orchestration — that stays with the parent page,
- embed heavy form logic inline; keep it in a `ui/forms/` component the drawer composes.

Choose a drawer over a dialog for taller forms and contextual side panels that should keep page context visible; reserve full routed pages for primary multi-step workflows (a drawer is for secondary, self-contained surfaces, not the feature's core workflow).

Structure rules:

- start with the smallest useful shape; create nested folders only when the drawer area actually needs them,
- keep the drawer presentational: the parent page provides data through inputs and reacts to outputs,
- keep these nested folders private by default; external consumers import through the concern-level `ui/drawers` barrel, not through deep implementation paths,
- if a drawer-local helper or type becomes broadly reusable across the feature, promote it to the appropriate feature-level concern instead of importing it through another drawer's private folder.

### 9.5 `data-access/`

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
      <concern>.service.spec.ts
  adapters/               # optional
    <concern>.adapter.ts
```

Structure rules:

- keep `data-access/` root limited to role buckets and the public barrel,
- put injectable API classes under `data-access/services/`,
- give each service its own concern folder so the service, spec, and service-local helpers stay colocated,
- keep `data-access/index.ts` as the only stable external entry point for the feature's public services,
- keep `data-access/services/` and `data-access/adapters/` private by default; other folders import through `@features/<feature>/data-access`, not through implementation paths,
- add extra internal buckets such as `testing/` only when the `data-access` concern genuinely owns reusable test helpers or fixtures.

Do not add new feature CRUD services to `core/services/hydra-api`.

Target rule:

Every feature API service must extend `HydraApiService` from `@core/services/hydra-api`.

`HydraApiService` provides:

- `getCollection<T>()` — returns `Observable<HydraCollection<T>>`,
- `getOne<T>()` — returns `Observable<T>`,
- `post<TInput, TOutput>()`, `put<TInput, TOutput>()`, `patch<TInput, TOutput>()`, `delete()`,
- `buildUrl()`, `buildParams()`, `buildHeaders()` for lower-level assembly,
- automatic `withCredentials: true` and `Content-Type: application/ld+json`,
- centralized error handling via `catchError(this.handleError)`.

Services must not build `HttpParams` or `HttpHeaders` manually outside of `HydraApiService`. If extra behavior is needed, extend the protected methods.

Services return transport types only. They do not derive view models or apply presentation logic.

If the API returns a generic `Record<string, unknown>` structure and multiple stores interpret the same fields, extract a pure adapter function in `data-access/adapters/` to centralize the normalization.

Adapters in `data-access/adapters/` are feature-internal by default. Do not expose them through a feature public API unless the adapter is intentionally part of a stable cross-feature contract. If multiple unrelated features need the same pure transformation, move it to `shared/utils` instead of importing another feature's adapter.

Example:

```text
features/organization/data-access/
  index.ts
  services/
    organization/
      organization.service.ts
  adapters/
    organization-dashboard-trend.adapter.ts
```

An adapter is a pure function, not a class.

```typescript
// organization-dashboard-trend.adapter.ts
export function getTrendPointValue(point: OrganizationDashboardTrendSeriesPoint): number {
  return Number(point['count'] ?? point['total'] ?? point['value'] ?? 0);
}
```

Do not scatter the same field-probing logic across every store's `computed` block.

### 9.6 `models/`

Feature-owned contracts and reusable feature types belong to the owning feature.

`models/` is the feature contract catalog. It does not own store state interfaces.

**A model is a type-only declaration.** It describes the _shape_ of data and is fully erased at compile time: `interface`, `type` alias, and literal-union enum. A file that emits runtime code is not a model and does not belong in `models/`:

- pure functions (mappers, formatters, type guards, resolvers) belong in `utils/`,
- fixed runtime values (defaults, limits, named keys, lookup maps) belong in `constants/`,
- UI option sets for selects, menus, and filters belong in `options/`.

Those three sibling folders, and the rule for how high each unit sits, are defined in section 9.9.

Two cohesion exceptions are sanctioned — and only these two — because in both the type is _inseparable_ from a runtime value (it is derived from it or meaningless without it):

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

One declaration per file. The file name states the concept, and the suffix states the kind. Because `models/` is type-only, it carries only the two type-level suffixes:

| Suffix          | Kind                                              | Example                            |
| --------------- | ------------------------------------------------- | ---------------------------------- |
| `.interface.ts` | an `interface` (API contract or view model shape) | `intervention-output.interface.ts` |
| `.type.ts`      | a `type` alias, including domain literal unions   | `intervention-status.type.ts`      |

Runtime-bearing files belong in the sibling folders, **not** in `models/`: pure functions go to `utils/` (`.utils.ts`) and static `const` data to `constants/` (`.constants.ts`). The one exception is a presentation-registry concept folder (`<concept>-tag/`), where the resolver — keeping the singular `.util.ts` suffix because it stays in `models/` (for example `intervention-tag.util.ts`) — and its descriptor maps stay co-located with the descriptor interface so the registry reads as one unit.

Rules:

- export object/resource shapes as `interface`, not `type`,
- export domain enumerations as `type` literal unions, not `type`-with-`interface` hybrids,
- keep the kind suffix on the file name so concept folders stay scannable,
- a concept folder normally holds only type-only files (the output interface and its status/priority unions) plus a barrel re-export through the feature `models/index.ts`; a `.util.ts` or `.constants.ts` here signals a registry concept folder.

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
  intervention/
    intervention-output.interface.ts
    intervention-status.type.ts          # domain literal union (enum)
    intervention-priority.type.ts
  intervention-tag/                       # enum presentation registry
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
- if a view model is private to one store, define it locally in that store file.

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

Because the type is computed from the value, the two cannot be separated cleanly, and consumers almost always use the const (`ORGANIZATION_PERMISSION.ROLES_READ`) and the type (`OrganizationPermissionName`) together. So the whole catalog — const, derived type, and the derived name list — stays in one file in `models/` and is exported as a single unit through the feature `models/index.ts` barrel. This is the **only** case where a `const` lives in `models/`.

Distinguish it from a hand-written union with a parallel runtime list: when the `type` is written by hand and a separate `const` array merely _enumerates_ its members (the two are independent), they are **not** a const-enum — the union stays in `models/` and the array moves to `constants/` (section 9.9).

Do not centralize feature model catalogs under `core/models`.

`core/models` is reserved for truly shared transport types:

- Hydra envelope types (`HydraCollection`, `HydraItem`, `HydraView`),
- Mercure subscription types,
- `ApiError` (RFC 7807 problem details).

### 9.7 `state/`

The `state/` folder owns feature stores, store-local helpers, store events, and store state interfaces.

Store location follows business ownership, not provider scope.

If a store represents organization state, it belongs to `features/organization/state` even if it is root-provided.

Only truly app-wide state or shared store infrastructure belongs outside feature state.

Default structure rules:

- `state/` is slice-first: the root of `state/` should contain `index.ts` and state slice folders,
- each store or closely related store pair gets its own slice folder even when the slice is small,
- slice names are business or workflow names, not technical buckets,
- within a feature's `state/`, avoid repeating the feature name when the parent path already gives the context,
- use descriptive slice names such as `auth/`, `session/`, `trusted-device/`, `password-reset/`, `organization-list/`, or `active-organization/`,
- every slice follows one uniform structure and only omits folders that are not needed,
- `models/` contains slice-local state interfaces and slice-local types,
- `events/` contains slice-local event groups,
- `utils/` contains pure helpers private to the slice,
- `features/` is reserved for shared `signalStoreFeature(...)` building blocks when the slice needs them,
- `testing/` contains slice-local tests when that slice has dedicated tests,
- the store file stays at the slice root; supporting files move into the optional subfolders above instead of staying flat,
- optional support subfolders expose their own local `index.ts` barrel when imported from the slice root or sibling subfolders,
- inside a single-store slice, prefer short support filenames such as `models/state.interface.ts` and `events/events.ts` because the slice folder already provides the business context,
- each leaf slice should expose a local `index.ts` barrel so the feature-level `state/index.ts` can re-export through slice entrypoints instead of deep file paths,
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
    testing/                    # optional
  session/
    index.ts
    events/
      events.ts
      index.ts
    models/
      state.interface.ts
      index.ts
    session.store.ts
  trusted-device/
    index.ts
    events/
      trusted-device.events.ts
      index.ts
    models/
      trusted-device-state.interface.ts
      index.ts
    trusted-device.store.ts
```

Aggregate slice example:

```text
state/
  organization-dashboard/
    index.ts
    organization-dashboard.store.ts
    organization-dashboard-state.interface.ts   # optional
    slices/
      overview-trend/
      inspection-quality-trend/
      inspections-trend/
      asset-growth/
      equipment-created-trend/
      facilities-created-trend/
      non-conformities-opened-trend/
      non-conformities-resolved-trend/
    features/
      organization-dashboard-filter.feature.ts
    models/
      organization-dashboard.types.ts
    utils/
      organization-dashboard.constants.ts
      organization-dashboard-persistence.utils.ts
    testing/                                    # optional
```

Aggregate slice rules:

- use the aggregate layout only when a slice owns both a parent store and multiple related child slices,
- aggregate slices still follow the same uniform idea: keep the root store at the slice root and add only the optional support folders that are actually needed,
- `slices/` contains child state slices only,
- child slices inside `slices/` should also expose their own local `index.ts` barrels,
- `features/` contains shared `signalStoreFeature(...)` building blocks and state-composition helpers,
- `models/` contains types shared across multiple child slices in the same aggregate state domain,
- `utils/` contains pure helpers and constants private to the aggregate state domain,
- `events/` is optional and should exist only if the aggregate root store exposes aggregate-level events,
- `testing/` is optional and should exist only if the aggregate slice has dedicated tests at its own root,
- store-specific state interfaces, events, and local helpers stay inside the owning child slice until they are truly shared.

When `state/` is split, `state/index.ts` may re-export the primary stores or event groups that other layers are allowed to consume.

Do not re-export every private helper, every local event file, or every leaf store by default.

Internal-only stores may be imported directly from their slice only inside the owning feature.

#### Async call state pattern

Every async action must expose explicit call state. The `Operation<TData, TError>` type is retired.

**Import from `@core/state/request-state`:**

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
} from '@core/state/request-state';
```

Lifecycle:

```
idle -> pending -> success
                -> error
```

- `idleCallState()`: initial state, nothing triggered yet,
- `pendingCallState(previous?)`: in-flight; optionally preserves cached data,
- `successCallState(data)`: succeeded with typed payload,
- `errorCallState(error, previous?)`: failed; use `toStoreError(err)` to normalize any error.

Type guards: `isCallPending(state)`, `isCallSuccess(state)`, `isCallError(state)`.

**Two patterns for async state, chosen by store shape:**

**Pattern 1 — Named `CallState` fields** (stores with multiple calls: CRUD, multi-command workflows).

Declare one `CallState` field per call in the state interface:

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

Drive transitions with `patchState` and the factory functions:

```typescript
patchState(store, { createCallState: pendingCallState() });
patchState(store, { createCallState: successCallState(user) });
patchState(store, { createCallState: errorCallState(toStoreError(err)) });
```

**Pattern 2 — `withQueryState` feature** (stores with exactly ONE primary query concern).

Use the custom NgRx SignalStore feature for simple single-resource or chart-data stores:

```typescript
import {
  withQueryState,
  setPendingQuery,
  setSuccessQuery,
  setErrorQuery,
  toStoreError,
} from '@core/state/request-state';

export const TrendStore = signalStore(
  withQueryState<TrendResource>(), // provides: isQueryLoading, isQueryLoaded, queryData, queryError
  withState<TrendFilterState>(INITIAL_FILTER_STATE),
  withMethods((store) => ({
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

**Rules:**

- Do not use ad-hoc `boolean` flags when a `CallState` field already covers the same cases.
- Do not use `rxResource` / `httpResource` as the store standard — Angular marks `resource` as experimental. Use `rxMethod` + `tapResponse` for all store-level fetches.
- `withQueryState` is for stores with ONE query. For multi-call stores, use named `CallState` fields.

#### Store structure pattern (NgRx SignalStore)

**Multi-action/workflow stores** (CRUD, multiple concurrent async operations):

```typescript
export const FeatureStore = signalStore(
  withEntities({ entity: type<EntityOutput>(), collection: 'entity' }),  // optional
  withState<FeatureState>(INITIAL_STATE),    // 1. raw state (CallState fields + filter state)
  withComputed((store) => ({                 // 2. derived signals
    ...
  })),
  withMethods((store, service = inject(FeatureService)) => ({  // 3. actions
    load: rxMethod<Params>(pipe(
      tap(() => patchState(store, { listCallState: pendingCallState() })),
      switchMap((params) =>
        service.get(params).pipe(
          tapResponse({
            next: (data) => patchState(store, { listCallState: successCallState(data) }),
            error: (err)  => patchState(store, { listCallState: errorCallState(toStoreError(err)) }),
          }),
        ),
      ),
    )),
  })),
  withHooks((store) => ({                    // 4. lifecycle wiring
    onInit(): void { ... },
  })),
);
```

**Single-query stores** (dashboard cards, chart stores, simple resource loaders):

```typescript
export const TrendStore = signalStore(
  withQueryState<TrendResource>(),           // 1. async query state (isQueryLoading, queryData, queryError)
  withState<TrendFilterState>(INITIAL_FILTER_STATE),  // 2. local filter/UI state
  withComputed((store) => ({                 // 3. derived signals
    ...
  })),
  withMethods((store, service = inject(FeatureService)) => ({  // 4. actions
    ...
  })),
  withHooks((store) => ({                    // 5. lifecycle wiring
    onInit(): void { ... },
  })),
);
```

Rules:

- `withQueryState` and `withState` come before `withComputed` and `withMethods`.
- `withHooks` is last.
- `withMethods` receives injected services as default parameter values.
- `rxMethod` is the standard pattern for reactive data fetching triggered by signal changes.
- `tapResponse` from `@ngrx/operators` is the standard for handling async success/error in a `pipe`.
- `patchState` is the only mutation mechanism. Direct state assignment is forbidden.
- `INITIAL_STATE` is a typed constant; all call states start with `idleCallState()`.

#### Collection state pattern (withEntities)

For feature stores managing entity collections, use `withEntities`:

```typescript
withEntities({ entity: type<EntityOutput>(), collection: 'entity' }),
```

This provides:

- `entityEntities`: ordered array of all cached entities,
- `entityEntityMap`: O(1) lookup map by id,
- `entityIds`: ordered list of entity ids.

Use `setAllEntities`, `addEntity`, `removeEntity`, `removeEntities` to mutate.

Do not maintain manual arrays for collections when `withEntities` covers the same case.

#### Store event pattern

When a store action has notable consequences for other layers (navigation, toast, sibling stores), emit a typed event instead of calling the consumer directly.

Use `eventGroup` from `@ngrx/signals/events`:

```typescript
// auth.events.ts
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
  login: rxMethod<LoginInput>(pipe(
    tapResponse({
      next: () => { ... },
      error: (err) => {
        const storeError = toStoreError(err);
        patchState(store, { loginCallState: errorCallState(storeError) });
        dispatcher.dispatch(
          authStoreEvents.loginFailed(toStoreFailureEventPayload(storeError, 'Login failed')),
        );
      },
    }),
  )),
}))
```

Events are store-owned. Pages and interceptors may listen; stores must not listen to their own events inside the same store instance.

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
3. the payload is reasonably small and justified in the HTML,
4. the ownership stays obvious at one store or route boundary.

Prefer this decision order:

1. route-critical data: resolver + shared/root store,
2. shell or page bootstrap data that must survive hydration without a duplicate auth request: explicit `TransferState`,
3. secondary data (tabs, dialogs, parent pickers, form option lists, hidden widgets): browser-only lazy load or load-on-open.

Rules:

- do not use `TransferState` as a default answer for authenticated requests,
- do not serialize large collections just to avoid one browser request,
- do not hydrate data for UI that is hidden on first paint,
- do not serialize secrets or bearer tokens,
- remove the key after browser consumption.

Do not rely on `TransferState` for data that changes per user session within the browser.

### 9.8 `http/` and `providers/`

Ownership follows the concern.

- application-wide guards and routing strategies belong to `core/routing/guards` and `core/routing/strategies`,
- global transport interceptors belong to `core/http/interceptors`,
- feature-specific guards, resolvers, and feature-scoped interceptors belong to the owning feature under `http/`,
- feature bootstrap providers belong to `features/<feature>/providers`,
- app shell composition stays in `app.config.ts` and `app.routes.ts`.

Feature `http/` layout:

```text
features/<feature>/http/
  guards/                # optional
  resolvers/             # optional
  interceptors/          # optional, feature-scoped only
```

Resolvers are for route-critical data only.

Guards answer access and redirection questions only.

Feature interceptors are rare. Use them only when the behavior is owned by one feature and is wired through that feature's providers. Cross-application transport behavior stays in `core/http/interceptors`.

Providers must not be moved to `core` just because they are called from the app shell.

### 9.9 `utils/`, `constants/`, and `options/` (non-model unit folders)

`models/` is type-only (section 9.6). Everything that emits runtime code lives in one of three sibling unit folders, chosen by what the unit _is_, then placed at the right height by usage locality (section 3.8). The same three folder names already appear locally inside a component, dataview, or form group (sections 9.2–9.4); this section makes them the standard at every scope.

| Folder       | Owns                                                            | File suffix     | Examples                                          |
| ------------ | --------------------------------------------------------------- | --------------- | ------------------------------------------------- |
| `utils/`     | pure, stateless functions over models and primitives            | `.utils.ts`     | `api-date-time.utils.ts`, `map-facility.utils.ts` |
| `constants/` | fixed runtime values: defaults, limits, named keys, lookup maps | `.constants.ts` | `pagination-defaults.constants.ts`                |
| `options/`   | UI option sets for `p-select`, menus, and filters               | `.constants.ts` | `facility-type-options.constants.ts`              |

The file inside a `utils/` folder takes the plural `.utils.ts` suffix, matching the folder name. A pure helper that stays co-located in a `models/` registry concept folder keeps the singular `.util.ts` (for example `intervention-tag.util.ts`); the suffix follows where the file lives.

Shared rules:

- **one declaration per file**, named after its purpose, with a barrel `index.ts` that is the only public entry point,
- `utils/` functions are pure: no Angular DI, no HTTP, no store access, no side effects — anything that needs DI is a service (`data-access/`) or a store helper (`state/`),
- `constants/` holds data, not behavior; if a constant needs a function to be useful, the function lives in `utils/`,
- `options/` is for presentation-layer choice lists; it never holds transport defaults (those are `constants/`),
- none of these folders holds a `type` or `interface` declaration — those are models and belong in `models/` (a util may _import_ the types it operates on).

Placement (apply section 3.8):

- used by **one** component, dataview, or form → keep it in that group's local `utils/` · `constants/` · `options/` folder,
- used by **several** units of one feature → lift to the feature-level `features/<feature>/utils` · `constants` · `options`,
- used by **several** features and domain-agnostic → `shared/utils` · `shared/constants`,
- **app-wide infrastructure** → `core/` (for example `core/state/request-state` utilities).

Feature-level layout:

```text
features/<feature>/
  models/        # type-only: interfaces, type aliases, literal-union enums
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

A unit stays where it is until a consumer in a higher scope actually appears; only then is it lifted, and only as far as the shared scope requires. Outside code never reaches into a unit's local folder — it imports the lifted unit through the public barrel (section 11.4).

## 10. Routing, SSR, and Hydration

### 10.1 Route ownership

- `app.routes.ts` owns top-level layout selection and feature entry points,
- each feature owns its own route tree,
- nested features own nested routes only when ownership is actually nested.

### 10.2 Resolver responsibility

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

### 10.3 Avoid duplicate fetches

If a resolver loads data, one of the following must be true:

- it seeds the owning store,
- it writes into transfer state,
- it is the only loading path for that route-critical data.

Fetching the same entity in both resolver and page initialization is an anti-pattern.

### 10.4 SSR behavior must be explicit

Every route-critical flow must define behavior for:

- browser navigation,
- per-request SSR,
- hydration,
- prerender or request-less server contexts.

Do not assume request-bound auth state exists in every server execution context.

### 10.5 App initialization is for app-wide bootstrap only

App initializers are reserved for concerns that must be known before the app can safely continue.

Examples:

- auth and session restoration,
- runtime environment bootstrap,
- shell-level initialization.

Do not move feature page loading into global bootstrap.

## 11. Imports and Public APIs

### 11.1 Use aliases at architectural boundaries

Use path aliases for any import that crosses a feature, layer, or concern boundary.

Use relative imports only within a small local area such as one component folder, one state slice, or one tight file group inside the same concern.

Switch from relative imports to aliases as soon as the import crosses `ui/`, `state/`, `models/`, `data-access/`, `http/`, or feature root boundaries.

### 11.2 Every externally consumed folder exposes a public API

Externally consumed folders are explicit, not implicit.

Every folder meant to be imported from outside its own local area must expose either:

- an `index.ts`, or
- a clearly named single entry file.

Standard public API surfaces include:

- `features/<feature>/index.ts` for stable feature-level exports used by other features or layouts,
- `features/<feature>/http/guards/index.ts` for guards intentionally consumed outside the local HTTP slice,
- `features/<feature>/http/resolvers/index.ts` for resolvers intentionally consumed outside the local HTTP slice,
- `features/<feature>/http/interceptors/index.ts` when a feature intentionally exposes feature-scoped interceptors,
- `features/<feature>/ui/components/index.ts` for feature widgets consumed outside their own local folder,
- `features/<feature>/ui/forms/index.ts` when forms are reused across multiple pages inside the feature,
- `features/<feature>/ui/dialogs/index.ts` when dialogs are opened from more than one page inside the feature,
- `features/<feature>/ui/drawers/index.ts` when drawers are opened from more than one page inside the feature,
- `features/<feature>/data-access/index.ts` for services intentionally consumed outside their own local area,
- `features/<feature>/models/index.ts` for feature contracts and reusable feature types intentionally consumed outside one local model slice,
- `features/<feature>/state/index.ts` when stores or event groups are intentionally consumed outside their own state slice,
- `shared/components/index.ts` for shared UI primitives.

Internal-only folders do not require or deserve a public barrel by default:

- `features/<feature>/data-access/services/`,
- `features/<feature>/data-access/adapters/`,
- `features/<feature>/ui/pages/`,
- private `state/` slices that are not part of the feature's public surface,
- nested `utils/`, `testing/`, or helper folders local to one component or slice.

Examples:

- `@features/organization/ui/components`
- `@features/account/ui/components`
- `@shared/components`

External consumers should target the narrowest stable public barrel, usually the concern-level barrel.

Deep imports into another area's implementation files or private folders are forbidden.

### 11.3 Barrels are public surfaces, not dumping grounds

Barrels must export the intended public API only.

They must not re-export every helper by default.

Concern-level barrels such as `ui/components`, `ui/forms`, `data-access`, `models`, `state`, `http/guards`, or `http/resolvers` are the preferred external entry points.

`data-access/index.ts` re-exports stable service classes only. It must not expose adapters, fixtures, or service-local helpers.

The feature root barrel should expose only the stable tokens meant for other features, layouts, or the app shell. It must not mirror the entire internal folder tree.

When `state/` is split, `state/index.ts` re-exports only the primary stores and events that are intentionally public to the rest of the feature or to approved consumers.

Per-component `index.ts` files may exist for local organization, but cross-folder consumers should still import through the documented concern-level barrel unless that component folder is itself the documented public entry point.

### 11.4 Do not create import shortcuts through the wrong layer

Anti-patterns:

- putting feature business services under `@core/services/hydra-api`,
- putting feature models under `@core/models`,
- putting domain-aware widgets under `@shared/components`,
- importing a component implementation file such as `@features/<feature>/ui/components/<name>/<name>.component` from outside its own local folder,
- importing another feature's `data-access/services/` folder as if it were a public API,
- importing another feature's `data-access/adapters/` folder as if it were a shared API,
- keeping compatibility shims only to preserve outdated import paths.

## 12. Testing and Documentation Expectations

### 12.1 Test the architectural boundary that the unit owns

- data-access services: contract mapping and transport behavior,
- stores: state transitions and orchestration,
- guards and resolvers: routing decisions,
- pages: orchestration and child interaction,
- presentational components and dataviews: rendering and outputs.

### 12.2 Architecture decisions must stay visible

When introducing a new pattern, update this document or add a short architecture note.

Do not let architecture drift appear silently through implementation.

### 12.3 Prefer meaningful documentation over mechanical comments

Document:

- public abstractions,
- non-obvious ownership decisions,
- SSR and routing caveats,
- reasons for approved exceptions.

Avoid comments that merely restate obvious types or code.

## 13. Approved Patterns

The following patterns are approved for new work.

- a page injects stores, reads route state, and passes plain inputs and outputs to children,
- a feature resolver loads route-critical context and seeds the owning feature store,
- a layout keeps its partials, directives, and shell services in its own folder,
- a layout imports a feature-owned shell widget through the feature public API,
- a layout that needs behavioral data (user identity, notification count, organization context) injects the relevant port token, never the owning feature's concrete store directly,
- a feature-owned port is bound in the feature's provider using `{ provide: PORT_TOKEN, useExisting: ConcreteAdapter }`,
- a core-owned contract is bound in the `core/` provider that owns the concrete implementation,
- a shared component that needs infrastructure injects an owner-published contract, never a concrete `core/` service,
- global HTTP concerns remain in `core/http/interceptors`,
- a feature owns its own `data-access`, `state`, `models`, optional `http`, optional `ports`, optional `providers`, and optional `utils` / `constants` / `options` folders,
- a model stays type-only; pure functions live in `utils/`, fixed values in `constants/`, and UI option sets in `options/`, each placed at the lowest layer that covers all its consumers (sections 3.8 and 9.9),
- async actions use `CallState` with `idleCallState` in initial state and `pendingCallState` / `successCallState` / `errorCallState` in methods,
- stores use `rxMethod` with `tapResponse` for reactive data loading,
- error normalization uses `toStoreError(err)` before calling `errorCallState`,
- entity collections use `withEntities` for O(1) id-based access,
- notable store transitions dispatch typed events via `eventGroup` and `Dispatcher`,
- imports target documented feature or concern public APIs instead of implementation files,
- pure adapter functions in `data-access/adapters/` normalize generic API payloads before they reach the store.

## 14. Anti-patterns

The following patterns must not be introduced in new code.

- adding new feature CRUD services under `core/services/hydra-api`,
- adding new feature model catalogs under `core/models`,
- loading the same entity in both resolver and page initialization,
- putting router synchronization or hidden reload logic inside a dataview,
- using `providedIn: 'root'` as a substitute for deciding ownership correctly,
- importing sibling feature internals through deep private paths,
- making `shared` depend on feature state or domain services,
- putting domain data fetching inside layouts,
- moving a domain-aware widget into `shared` only because it is rendered from a shell,
- keeping compatibility re-exports under the wrong layer to avoid updating imports,
- a layout injecting a concrete feature store or feature service directly when a port can express the same contract,
- a store injecting a concrete service from another feature's `data-access/` when a port boundary is intended,
- placing a behavioral contract in `core/tokens/` after the contract model is established; behavioral contracts belong with the owning feature or core concern,
- creating a port for a contract consumed only within a single feature; features may inject their own concrete services directly,
- putting contracts in a central technical folder when a clear owner exists,
- using ad-hoc `isLoading: boolean` flags instead of the `CallState` lifecycle,
- passing a raw `HttpErrorResponse` or `unknown` to `errorCallState` without calling `toStoreError` first,
- injecting `HttpClient` directly in a feature service instead of extending `HydraApiService`,
- importing a feature implementation file instead of a documented feature or concern public API,
- importing another feature's adapters as a reuse shortcut,
- scattering the same dynamic key-probing logic (e.g. `point['count'] ?? point['total'] ?? 0`) across multiple stores without a shared adapter function,
- placing adapter functions inside `computed` signals in a store,
- placing runtime code in `models/` — a pure function belongs in `utils/`, a fixed value or lookup map in `constants/`, a select option set in `options/` (the only exception is a cohesive presentation registry, section 9.6),
- declaring a `type` or `interface` in `utils/`, `constants/`, or `options/` instead of in `models/`,
- hoisting a model, util, constant, or option to the feature (or `shared/`, or `core/`) before a second consumer exists, instead of keeping it local until usage requires lifting (section 3.8),
- reaching into another component's private `models/`, `utils/`, `constants/`, or `options/` folder instead of lifting the shared unit first.

## 15. Transition Rules

The current codebase is not expected to align everywhere on day one.

Use these transition rules.

### 15.1 Legacy core business buckets

Existing code under:

- `core/models`,
- `core/services/hydra-api`,
- `core/stores`,
- legacy flat feature `state/` folders with files directly at the concern root,
- legacy flat feature `models/` folders with files directly at the concern root,
- legacy feature-root `guards/`, `resolvers/`, or `interceptors/` folders that predate the `http/` grouping,
- legacy flat feature UI folders such as `features/<feature>/pages`, `features/<feature>/components`, `features/<feature>/dataviews`, and `features/<feature>/forms`

may remain temporarily when it is part of legacy code.

However:

- do not add new files or new feature surface area to those legacy locations when the target location is clear,
- do not treat legacy flat feature UI folders as precedent for new feature structure,
- do not treat flat `state/` or `models/` roots as precedent for new feature structure,
- do not treat feature-root `guards/`, `resolvers/`, or `interceptors/` as precedent for new feature structure,
- when touching a feature substantially, move new files toward feature ownership,
- when restructuring a feature UI substantially, migrate toward `ui/` instead of extending the legacy flat layout,
- when restructuring feature routing concerns substantially, migrate toward `http/{guards,resolvers,interceptors}` instead of extending feature-root folders,
- when restructuring feature state or contracts substantially, migrate toward named `state/` slices and concept-first `models/` folders instead of extending flat roots,
- prefer migration by opportunity instead of large blind rewrites.

### 15.2 New code follows target ownership immediately

Even if surrounding code is still legacy, any new file should be placed according to the target structure unless that would create disproportionate churn.

For UI code, the target structure means `ui/pages`, `ui/components`, `ui/dataviews`, `ui/forms`, `ui/dialogs`, and `ui/drawers`.

For feature routing concerns, the target structure means `http/guards`, `http/resolvers`, and `http/interceptors`.

For feature state and contracts, the target structure means named `state/` slices behind `state/index.ts` and concept-first `models/` folders behind `models/index.ts`.

### 15.3 Exceptions require an explicit note

If a change must violate this document temporarily, add a short note in the pull request or a local architecture note explaining:

- why the exception exists,
- how long it is expected to remain,
- what migration path is intended.

## 16. Review Checklist

Before merging a change, verify the following.

- Is the file placed in the layer that owns the concern?
- Does the dependency direction respect the layer model?
- Is business logic owned by a feature instead of being pushed into `core`?
- Is app-wide infrastructure kept out of feature folders?
- If the feature owns guards, resolvers, or feature-scoped interceptors, are they under `http/` instead of at feature root?
- If the feature owns stores, are they organized into named `state/` slices instead of a flat `state/` root?
- If the feature owns contracts or reusable feature types, are they organized into concept-first `models/` folders with prefixes only for overly generic names?
- Is `models/` type-only, with pure functions in `utils/`, fixed values in `constants/`, and UI option sets in `options/` (registry exception aside)?
- Is each model, util, constant, and option set placed at the lowest layer covering all its consumers, and kept local until a second consumer forces it up?
- If the file is rendered in a layout, is its ownership still correct?
- Does the page own orchestration instead of the dataview or child component?
- If a resolver exists, is it truly route-critical and free of duplicate fetches?
- If SSR is involved, is hydration behavior explicit?
- For cross-feature or cross-concern imports, are aliases and the narrowest public APIs used instead of deep private files or long relative paths?
- Are new tests focused on the correct architectural boundary?
- If the code deviates from this document, is the exception explicit?
- Does every async action use `CallState` (`idleCallState`, `pendingCallState`, `successCallState`, `errorCallState`) instead of ad-hoc boolean flags?
- Is every store error normalized with `toStoreError(err)` before being stored?
- Does the feature API service extend `HydraApiService` instead of injecting `HttpClient` directly?
- If a generic API payload is consumed in multiple places, is there a shared adapter function?
- Is `withEntities` used for entity collections that need O(1) id-based access?
- If a notable action can affect sibling parts of the app, does it dispatch a typed event?
- If a layout depends on behavioral data from a feature (identity, notifications, organization), does it inject a port instead of the concrete feature store?
- If a feature publishes a contract to external consumers, is that contract expressed as a port in `features/<feature>/ports/` and bound in the feature's provider?
- If a shared component needs infrastructure, does it inject a contract from the owning `core` concern instead of a concrete `core` service?
- Are new behavioral contracts placed with the owning feature or core concern rather than in `core/tokens/` or a central dumping folder?

## 17. HTTP Transport Architecture

This section documents the precise layering of HTTP concerns in the application and defines the contract each layer must fulfill.

### 17.1 Layer overview

```
Browser / Node.js
  └── Angular HttpClient
        └── Interceptor pipeline (core/http/interceptors)
              ├── ssr-cookie-forward  — forwards browser cookies on server-side requests
              ├── auth                — injects Bearer token on non-public endpoints
              └── unauthorized        — redirects on 401, clears session
        └── HydraApiService (core/services/hydra-api/hydra-api.service.ts)
              └── Feature API services (features/<feature>/data-access)
                    └── Feature stores (features/<feature>/state)
```

Nothing outside of `core/http/interceptors` may modify request headers or intercept responses at the transport level.

### 17.2 Interceptor responsibilities

Each interceptor has a single responsibility.

- `ssr-cookie-forward`: copies browser-sent cookies (`Cookie` header) to outgoing server-side HTTP requests, enabling transparent session forwarding during SSR. No side effects on the browser.
- `auth`: injects the `Authorization: Bearer <token>` header on all requests whose URL does not match the public endpoints list. Does not perform refresh logic.
- `unauthorized`: catches `401 Unauthorized` responses and triggers a session invalidation and redirect. Does not retry requests.

### 17.3 HydraApiService contract

`HydraApiService` is the only class that constructs HTTP calls for business data.

Rules:

- All feature API services must extend `HydraApiService`.
- Services must not inject `HttpClient` directly.
- Services return `Observable<T>`. They never subscribe internally, never `catch`, never transform to view models.
- Errors propagate without interception to the store layer, which handles them via `tapResponse`.

### 17.4 SSR fetch strategy

Authenticated SSR data must not be treated uniformly.

Use the smallest strategy that matches the UI need:

1. Resolver + shared store for route-critical content that the SSR HTML truly depends on.
2. Explicit `TransferState` only for first-render shell or page bootstrap data that would immediately duplicate after hydration.
3. Browser-only lazy load for secondary panels, tabs, dialogs, dropdown option lists, and other non-critical enrichments.

Do not expand `TransferState` to every authenticated list. If the UI can tolerate a client-side skeleton or an on-open fetch, prefer that over serializing extra payload into the HTML.

- URL construction uses `buildUrl(path, id?)` and `buildParams(options?)`.
- The base content type is `application/ld+json`. Do not override it unless the endpoint explicitly requires it (e.g., file uploads use `multipart/form-data`).

### 17.5 API error contract

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

### 17.6 Error flow across layers

```
HttpClient error (HttpErrorResponse)
  → interceptors (unauthorized 401 → redirect)
  → service Observable propagates the error
  → store rxMethod catches in tapResponse.error
  → toStoreError(err) normalizes to StoreError
  → patchState writes errorCallState(storeError) into the CallState field
  → page's computed reads: isCallError(store.<call>CallState())
  → page decides UI reaction (toast, inline error, retry)
```

No layer skips a step. A page must not read raw `HttpErrorResponse` from a service; it reads the normalized `StoreError` through the store's `CallState` signal (see section 9.7).

### 17.7 Hydra transport model

Collection responses from the API follow the Hydra/JSON-LD envelope:

```typescript
interface HydraCollection<T> {
  readonly 'hydra:member': T[];
  readonly 'hydra:totalItems': number;
  readonly 'hydra:view'?: HydraView;
}
```

Use `getCollection<T>()` when the endpoint returns a Hydra collection.
Use `getOne<T>()` when the endpoint returns a single resource.

Stores that need pagination must read `'hydra:view'` and `'hydra:totalItems'` from the collection response.

---

## 18. Store Patterns Reference

This section codifies the exact patterns used in the codebase for async call state and NgRx SignalStore structure. These are not suggestions; they are the standards.

The canonical async-state and store templates live in section 9.7. This section is a quick reference and adds the store-scoping, collection, event, and adapter decisions that 9.7 does not.

### 18.1 Async call state

The retired `Operation<TData, TError>` type and its `createIdleOperation` / `createLoadingOperation` / `createSuccessOperation` / `createErrorOperation` constructors must not appear in new code. Use `CallState` from `@core/state/request-state` (see section 9.7 for the full lifecycle).

The four states:

| State     | Meaning                                                     | Factory                            |
| --------- | ----------------------------------------------------------- | ---------------------------------- |
| `idle`    | Nothing triggered yet.                                      | `idleCallState()`                  |
| `pending` | In-flight; may carry previous cached data.                  | `pendingCallState(previous?)`      |
| `success` | Completed successfully with typed payload.                  | `successCallState(data)`           |
| `error`   | Failed; normalized error attached, may carry previous data. | `errorCallState(error, previous?)` |

Error normalization is always done with `toStoreError(unknown)` which:

- detects `ApiError` (RFC 7807), wraps it preserving `status`, `type`, `title`, `detail`,
- detects `ConstraintViolation` and wraps accordingly,
- falls back to a generic `StoreError` for any other thrown value.

Never pass a raw `HttpErrorResponse` or `unknown` to `errorCallState`: always call `toStoreError(err)` first.

Read call state with the guards `isCallPending`, `isCallSuccess`, `isCallError`.

### 18.2 Canonical store template

```typescript
// feature-state.interface.ts (lives in state/<slice>/models/)
export interface FeatureState {
  createCallState: CallState<FeatureOutput>;
  listCallState: CallState<FeatureOutput[]>;
}

const INITIAL_STATE: FeatureState = {
  createCallState: idleCallState(),
  listCallState: idleCallState(),
};

// feature.store.ts
export const FeatureStore = signalStore(
  { providedIn: 'root' }, // or omit and add to component providers
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
          service.getAll(options).pipe(
            tapResponse({
              next: (res) =>
                patchState(store, {
                  listCallState: successCallState(res['hydra:member']),
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
    onInit(): void {
      store.load({}); // wire reactive source if needed
    },
  })),
);
```

For a store with exactly one query concern, prefer the `withQueryState` feature instead of a named `CallState` field (see section 9.7, Pattern 2).

### 18.3 Root-provided vs component-scoped stores

| Criterion                                         | Root-provided (`{ providedIn: 'root' }`) | Component-scoped (added to `providers:`) |
| ------------------------------------------------- | ---------------------------------------- | ---------------------------------------- |
| State persists across navigation                  | Yes                                      | No; destroyed with component             |
| Used by multiple unrelated features               | Yes                                      | No                                       |
| Data is user-session-tied and expensive to reload | Yes                                      | Not recommended                          |
| Data is route-specific and must reset             | Not recommended                          | Yes                                      |
| Used only within one route subtree                | Can use either                           | Prefer scoped                            |

Do not use `{ providedIn: 'root' }` as a default for every store. Scoped stores are lower-risk and more predictable for route-specific data.

### 18.4 Entity collections (withEntities)

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

Do not use `withEntities` for a single resource or a list that is always fully replaced at once and never needs `id`-based lookup. Use a standard `CallState<T[]>` field instead.

### 18.5 Event system

Stores expose notable transitions as typed events using `eventGroup`.

When to emit an event:

- an action failed and another part of the app must react (redirect, clear related state, show notification),
- an action succeeded and a sibling store must invalidate or refresh,
- a page or layout needs to react to a state change without polling the store signal.

Dispatch events via `Dispatcher` in the `withMethods` layer.

Listen to events via `inject(EventDispatcher)` in a service or in `withHooks` of a different store.

A store must not both emit and listen to the same event group instance; that creates circular logic.

Store event files should live next to the owning store or inside the owning state slice, typically as `<concern>.events.ts`.

### 18.6 Adapter pattern

Use a pure adapter function when the API response shape does not map 1:1 to what the store or component needs.

**When to use an adapter:**

- the API returns a generic `Record<string, unknown>` structure and the code must probe dynamic keys,
- the same API field normalization is duplicated across two or more stores or components,
- the target type is a frontend-only structure that the service should not know about.

**When not to use an adapter:**

- a simple rename of one field,
- derivation that belongs in a `computed` signal (e.g. formatting a date for display),
- transformation that only happens in one `computed` signal and is already readable.

**Placement:**

```text
features/<feature>/data-access/adapters/
  <concern>.adapter.ts    # one file per concern
```

`data-access/adapters/` is private to the owning feature by default.

Injectable API classes live separately in `data-access/services/<concern>/` so adapters remain obviously pure and side-effect free.

An adapter co-located with UI code (`ui/components/<component>/utils/`) is acceptable only when it transforms store or input data for one tightly coupled component group and zero reuse outside that group is expected.

**Form:**

```typescript
// Pure function taking the raw transport type, returning the domain type.
export function adaptTrendPoint(point: OrganizationDashboardTrendSeriesPoint): TrendPoint {
  return {
    value: Number(point['count'] ?? point['total'] ?? point['value'] ?? 0),
    bucket: String(point['bucket'] ?? point['date'] ?? point['label'] ?? ''),
  };
}
```

Adapters must not inject services, must not use `inject()`, and must not produce side effects.

---

## 19. Summary

The target architecture is:

- feature-first for business code,
- core-only for application-wide infrastructure,
- layouts as shells,
- shared as generic primitives,
- explicit ownership of state and API access,
- type-only `models/` with runtime code split into `utils/`, `constants/`, and `options/`,
- placement by usage locality — local first, lifted only when shared,
- explicit SSR and hydration rules,
- public APIs instead of deep imports.

When the current code and this document disagree, new work should move toward this document.
