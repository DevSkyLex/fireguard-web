# Main Feature

## Purpose

Owns the default authenticated landing area of the application.

This feature is responsible for:

- the root dashboard landing route (`/`), which forwards to the organizations
  entry point where `organizationGuard` resolves the user's default workspace.

This feature is intentionally thin. It must not absorb shell concerns, global routing infrastructure, or unrelated business workflows.

## Entry Points

- Routes: `main.routes.ts`
- Public API: `index.ts`

## Routes

- `/`

The root has no landing page of its own: FireGuard is organization-scoped, so
`/` redirects to `/organizations`, which forwards to the active organization's
workspace. The feature contributes no sidebar navigation — organization
switching is owned by `@features/organization`'s switcher.

## State and Data Access

There is no dedicated feature store or feature provider at this level today.

If the landing page grows into a real business workflow, state and data-access should be introduced here rather than leaking into layouts.

## Cross-Feature Dependencies

- May compose data from approved feature public APIs.
- Must not become a dumping ground for miscellaneous dashboard widgets that belong to another owning feature.

## Invariants

- The main feature remains a route-entry orchestration layer.
- Shared dashboard widgets stay with their owning feature or in `shared` if they are truly generic.
