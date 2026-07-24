# Error Feature

## Purpose

Provides static, standalone error pages for the application.
These pages are always accessible — no auth or onboarding guards are applied.

## Entry Points

- Routes: `error.routes.ts`
- Public API: `index.ts`

## Routes

| Route                 | Component          | Title              |
| ---------------------- | ------------------- | ------------------- |
| `/error/404`           | `NotFoundPage`       | Page not found       |
| `/error/403`           | `ForbiddenPage`       | Access denied         |
| `/error/500`           | `ServerErrorPage`     | Server error           |
| `/error/maintenance`   | `MaintenancePage`     | Under maintenance      |

Rendered inside `FocusedLayout` (see `app.routes.ts`). All pages are standalone,
lazy-loaded, `ChangeDetectionStrategy.OnPush`.

## State and Data Access

No stores or services — purely presentational.

## Triggers

Other layers navigate here; this feature does not own any workflow that leads to
these pages:

| Trigger                        | What it does                                                    |
| -------------------------------- | ------------------------------------------------------------------|
| `GlobalErrorHandler`            | Navigates to `/error/500`                                          |
| `maintenanceInterceptor`        | Navigates to `/error/maintenance` on 503                            |
| `maintenanceGuard`              | Redirects to `/error/maintenance` when maintenance is active         |
| `unauthorizedInterceptor`       | Navigates to `/error/403` on 403                                      |
| `app.routes.ts` wildcard `**`   | Redirects to `/error/404`                                              |

## Cross-Feature Dependencies

- Consumed by router navigation and infrastructure (`GlobalErrorHandler`, interceptors, guards) across the app; this feature must not be imported directly by other features.

## Invariants

- Error pages stay purely presentational: no stores, no services, no business logic.
- Other features and infrastructure reach these pages through router navigation, never by importing error-page components directly.
