# Error Feature

## Purpose

Provides static, standalone error pages for the application.
These pages are always accessible — no auth or onboarding guards are applied.

## Pages

| Route                | Component         | Title             |
| -------------------- | ----------------- | ----------------- |
| `/error/404`         | `NotFoundPage`    | Page not found    |
| `/error/403`         | `ForbiddenPage`   | Access denied     |
| `/error/500`         | `ServerErrorPage` | Server error      |
| `/error/maintenance` | `MaintenancePage` | Under maintenance |

## Architecture

- All pages are standalone, lazy-loaded, `ChangeDetectionStrategy.OnPush`.
- No stores or services — purely presentational.
- Rendered inside `FocusedLayout` (see `app.routes.ts`).

## Entry points

| Path                          | What it does                                                 |
| ----------------------------- | ------------------------------------------------------------ |
| `GlobalErrorHandler`          | Navigates to `/error/500`                                    |
| `maintenanceInterceptor`      | Navigates to `/error/maintenance` on 503                     |
| `maintenanceGuard`            | Redirects to `/error/maintenance` when maintenance is active |
| `unauthorizedInterceptor`     | Navigates to `/error/403` on 403                             |
| `app.routes.ts` wildcard `**` | Redirects to `/error/404`                                    |
