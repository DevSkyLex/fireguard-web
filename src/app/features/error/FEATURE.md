# Error Feature

## Purpose

Provides standalone error pages for the application.
These pages are always accessible — no auth or onboarding guards are applied.

## Entry Points

- Routes: `error.routes.ts`
- Public API: `index.ts`
- Guards: `http/guards/index.ts` (`notFoundRedirectGuard`, consumed by `app.routes.ts`)

## Routes

| Route        | Component         | Title                     |
| ------------ | ----------------- | ------------------------- |
| `/error/404` | `NotFoundPage`    | Page not found            |
| `/error/403` | `ForbiddenPage`   | No workspace you can open |
| `/error/500` | `ServerErrorPage` | Server error, or offline  |

Rendered inside `FocusedLayout` (see `app.routes.ts`). All pages are standalone,
lazy-loaded, `ChangeDetectionStrategy.OnPush`.

## State and Data Access

No stores and no transport. The pages read two things they do not own: the
address that failed (a query parameter) and browser connectivity
(`@core/connectivity`).

## Triggers

Other layers navigate here; this feature does not own any workflow that leads to
these pages:

| Trigger                       | What it does                                           |
| ----------------------------- | ------------------------------------------------------ |
| `GlobalErrorHandler`          | Navigates to `/error/500`                              |
| `unauthorizedInterceptor`     | Navigates to `/error/403` on 403                       |
| `organizationGuard`           | Navigates to `/error/403` when no organization is open |
| `app.routes.ts` wildcard `**` | Activates `notFoundRedirectGuard`                      |

Maintenance mode is not an error concern: `maintenanceInterceptor` and
`maintenanceGuard` belong to `features/maintenance` and route to `/maintenance`
(see that feature's `FEATURE.md`).

## Cross-Feature Dependencies

- **`@features/auth/ports` → `AUTH_LOGOUT_PORT`**, consumed by `ForbiddenPage`.
  A member who reaches 403 has no organization they can open, so every in-app
  destination leads back to the guard that sent them there. Signing out is one
  of the only two exits that are not a loop; the other is creating an
  organization. Recorded in `features/auth/FEATURE.md` as well.
- Consumed by router navigation and infrastructure (`GlobalErrorHandler`,
  interceptors, guards) across the app; this feature must not be imported
  directly by other features.

## Invariants

- Error pages own no business logic and no transport. Reading a query parameter
  or a connectivity signal to choose what to say is presentation, not state.
- **No exit may loop back into the guard that produced the page.** `/error/403`
  used to offer "Back to home", which resolves to `/organizations` — the guard
  that had just redirected here, which redirected here again. Any exit added to
  an error page is checked against the trigger that reaches it.
- **`/error/404` names a way back, not just "home".** `notFoundRedirectGuard`
  carries the failed address so the page can offer the collection it was
  reaching for; a plain `redirectTo` discards it. The address is untrusted
  input: only recognised collection segments become links.
- Other features and infrastructure reach these pages through router navigation,
  never by importing error-page components directly.
