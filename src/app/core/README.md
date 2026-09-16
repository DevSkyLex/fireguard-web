# Core

## Purpose

`core/` owns application-wide infrastructure — the concerns that are global to
the whole app, independent of any business domain.

It is the home for:

- runtime configuration (`config/environment`),
- the HTTP transport boundary (`api/` — Hydra models, transport guards, `HydraApiService`),
- the interceptor pipeline (`http/interceptors`),
- app-wide routing primitives (`routing/strategies`, `routing/guards`),
- shared async store infrastructure (`request-state`),
- appearance mode (`theme` — dark/light/system),
- interaction capabilities (`interaction-capabilities` — automatic mobile/desktop classification),
- shell-level concerns (`splash-screen`, `breadcrumb`, `page-actions`, `page-tabs`,
  `connectivity`, `cookie`, `mercure`, `title`, `locale`),
- neutral contracts (ports) backing shared UI.

`core/` is **not** a fallback for business code. Anything that knows a business
concept (organization, facility, equipment, inspection, account, session,
notification, auth) belongs to the owning feature.

## Structure — concern-first

`core/` is organized **concern-first**: each concern is a self-contained module
that owns one folder per service under `services/<name>/` (each with its spec in
a `testing/` subfolder), plus its `provider`, `ports/`, `models/`, and `utils/`,
behind a single `index.ts` barrel — the same shape as a feature. `locale/` and
`theme/` are the reference modules.

```text
core/
  api/            theme/         feedback/        splash-screen/
  breadcrumb/     connectivity/  cookie/          mercure/
  title/          request-state/ boot-readiness/  locale/
  page-actions/   page-tabs/     indexed-db/
  config/         http/          routing/         # infrastructure groupings
```

`indexed-db/` is the one concern that exposes an **abstract base class** rather
than an injectable service: there is no such thing as "the" local database,
only a feature's. Extend `IndexedDbService` and declare a schema, the same way
feature API services extend `HydraApiService`. Because `core` must not depend on
a feature, the owner id used by the per-user binding is a **parameter** — the
owning feature reads its identity port and passes it in.

Do **not** reintroduce flat type-first buckets (`core/services`, `core/ports`,
`core/models`, `core/utils`, `core/state`, `core/themes`). A concern's own
`models/` / `utils/` / `ports/` sub-folders are the target. The only shared,
ownerless transport bucket is `api/models` (Hydra envelope, `ApiError`,
`ConstraintViolation`).

`config/`, `http/`, and `routing/` stay as groupings because each owns several
sibling infrastructure primitives rather than a single concern.

## Allowed Dependencies

`core/` may depend on:

- other `core/` concerns,
- Angular and framework libraries.

`core/` must **never** depend on `features/`. When app-wide infrastructure must
consume state a feature owns, define a core-owned port and let the feature
implement it (see `boot-readiness` in `ARCHITECTURE.md` §5.6).

## Public API

Each concern is imported through its alias barrel — `@core/api`,
`@core/request-state`, `@core/theme`, `@core/cookie`, `@core/config/environment`,
etc. Import the concern barrel, never a deep implementation file.

See `ARCHITECTURE.md` §2.2, §8.1, and §11 for the normative rules.

## Interaction capabilities

`provideInteractionCapabilities()` initializes the one app-wide classification. Shell and shared
consumers inject `INTERACTION_CAPABILITIES_PORT`; the concrete adapter is private to this concern.
The public contract exposes `interactionMode`, `isMobileInteractionMode` and `shortcutModifier` signals, not
loading state or a user preference. Templates use `isMobileInteractionMode` for interaction decisions
and the shared modifier for platform-correct keyboard hints.
`html[data-interaction-mode]` also reaches portaled overlays through the `mobile-ui:` and
`desktop-ui:` Tailwind variants.

Automatic mode combines platform/device hints with touch capabilities. Desktop
platforms remain desktop even with touch or a narrow window. Phones and tablets keep
mobile mode when rotated, resized, or connected to a keyboard. Unknown/conflicting
signals default to desktop. The MacIntel/multiple-touch iPad heuristic is not proof
of hardware; browser spoofing and future hybrid devices remain ambiguous.

SSR classifies reliable request headers and transfers only the resulting mode so hydration
starts on the same branch. Request-less, unknown or contradictory environments stay desktop.
The browser reconciles capabilities once after rendering; spoofed or strongly privacy-reduced
clients may therefore fall back to desktop or make one correction. Raw user-agent evidence,
device fingerprints, auth data and business state are never transferred or persisted.

Viewport and container queries remain valid for geometry, never for selecting
mobile controls, drawers, target density, or navigation. Input modality is for
interaction affordances, not for switching interaction modes during a gesture.
