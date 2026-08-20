# Error

Top-level feature owning the full-screen error pages. No auth or onboarding
guard applies here: an error page must stay reachable in exactly the states
that produce one.

## Purpose

One page per HTTP-shaped failure the router can land on, mounted under
`/error` from `app.routes.ts` (centered layout, no sidebar):

| Path          | Page              | Sent here by                                                                  |
| ------------- | ----------------- | ----------------------------------------------------------------------------- |
| `/error/403`  | `ForbiddenPage`   | `organizationGuard` — every organization the member has is excluded           |
| `/error/404`  | `NotFoundPage`    | `notFoundRedirectGuard` (`app.routes.ts` wildcard), with `?from=<failed url>` |
| `/error/500`  | `ServerErrorPage` | `organizationGuard` — workspace resolution failed on transport                |
| anything else | → `404`           | the in-feature wildcard                                                       |

A plain HTTP 403 on an API call is deliberately **not** redirected here —
`unauthorizedInterceptor` leaves 403 responses to the surface that made the
call. This feature only serves failures that have no surface left to render.

## Entry Points

- Routes: `error.routes.ts` (`ERROR_ROUTES`)
- Public API: `index.ts` — `ERROR_ROUTES`, `notFoundRedirectGuard`

## Cross-Feature Dependencies

- `ForbiddenPage` consumes `AUTH_LOGOUT_PORT` from `@features/auth/ports` — an
  approved consumer recorded in `features/auth/FEATURE.md`. Signing out is the
  one exit from `/error/403` that cannot loop: every workspace link re-runs
  the guard that redirected here.

## Invariants

- No guard on these routes, ever — see Purpose.
- `NotFoundPage` names the failed address from the `from` query parameter set
  by `notFoundRedirectGuard`; keep the two in sync.
- `ServerErrorPage` retries via `router.navigate(['/'])` so the failed guard
  re-runs; it must not link into a workspace URL directly, which would skip
  the resolution that failed.
