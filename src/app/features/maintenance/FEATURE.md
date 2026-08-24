# Maintenance Feature

## Purpose

Owns application-wide maintenance mode: the flag that says the app is under
maintenance, the mechanisms that raise it (static config at startup, 503 API
responses at runtime), and the page shown while it is active. The page itself is
always accessible — no auth or onboarding guards.

## Entry Points

- Routes: `maintenance.routes.ts` (mounted at `/maintenance` in `app.routes.ts`)
- Public API: `index.ts`
- Bootstrap: `provideMaintenanceMode()` (`state/`), wired from `app.config.ts` —
  activates the store at startup when the environment config sets `maintenance: true`

## Routes

| Route          | Component         | Title             |
| -------------- | ----------------- | ----------------- |
| `/maintenance` | `MaintenancePage` | Under maintenance |

Rendered inside `FocusedLayout` (see `app.routes.ts`). The page is standalone,
lazy-loaded and `ChangeDetectionStrategy.OnPush`.

Its one action lowers the flag before returning to the workspace root: the store
is the only thing holding the reader here, and nothing else lowers it once the
API recovers. A still-unavailable API answers 503 again and the interceptor
brings them straight back, so a premature retry costs a round trip rather than
stranding anyone.

## State and Data Access

- `MaintenanceStore` (`state/`, root-provided): a single `isActive` flag with
  `activate()` / `deactivate()`. No data-access services — the feature performs
  no transport of its own.

Maintenance mode is raised through two paths:

| Trigger                  | What it does                                                           |
| ------------------------ | ---------------------------------------------------------------------- |
| `provideMaintenanceMode` | Activates the store at startup when `ENV_CONFIG.maintenance` is set    |
| `maintenanceInterceptor` | On a 503 response: activates the store and navigates to `/maintenance` |

`maintenanceGuard` (`http/guards/`) enforces the flag: it redirects to
`/maintenance` when the store is active. `app.routes.ts` applies it to the
authenticated route trees.

## Cross-Feature Dependencies

- Consumed only by the app shell: `app.routes.ts` (routes + guard) and
  `app.config.ts` (interceptor + bootstrap provider), through the feature's
  public barrels (`index.ts`, `state/`, `http/guards/`, `http/interceptors/`).
- Other features must not import this feature; they reach the page through
  router navigation only.

## Invariants

- `MaintenanceStore` is the single source of truth for maintenance mode; the
  interceptor and the startup provider are the only writers.
- The guard and interceptor stay side-effect-minimal: check or set the flag,
  redirect to `/maintenance` — no transport, no retry logic.
- The maintenance page stays purely presentational and free of guards, so it
  remains reachable while the rest of the app is blocked.
