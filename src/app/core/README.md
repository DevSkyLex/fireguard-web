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
- appearance mode (`theme` — dark/light/system) and PrimeNG library setup (`primeng` — design-token preset),
- shell-level concerns (`splash-screen`, `breadcrumb`, `connectivity`,
  `cookie`, `mercure`, `title`, `locale`),
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
  api/            theme/         primeng/         splash-screen/
  breadcrumb/     connectivity/  cookie/          mercure/
  title/          request-state/ boot-readiness/  locale/
  config/         http/          routing/         # infrastructure groupings
```

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
implement it (see `boot-readiness` in `ARCHITECTURE.md` §5.1).

## Public API

Each concern is imported through its alias barrel — `@core/api`,
`@core/request-state`, `@core/theme`, `@core/cookie`, `@core/config/environment`,
etc. Import the concern barrel, never a deep implementation file.

See `ARCHITECTURE.md` §3.2, §8.1, and §16 for the normative rules.
