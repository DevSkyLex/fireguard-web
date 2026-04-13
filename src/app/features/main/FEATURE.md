# Main Feature

## Purpose

Owns the default authenticated landing area of the application.

This feature is responsible for:

- the root dashboard landing route,
- route-entry page composition for the home page.

This feature is intentionally thin. It must not absorb shell concerns, global routing infrastructure, or unrelated business workflows.

## Entry Points

- Routes: `main.routes.ts`
- Public API: `index.ts`

## Routes

- `/`

The feature currently exposes a single lazy-loaded home page route.

## State and Data Access

There is no dedicated feature store or feature provider at this level today.

If the landing page grows into a real business workflow, state and data-access should be introduced here rather than leaking into layouts.

## Cross-Feature Dependencies

- May compose data from approved feature public APIs.
- Must not become a dumping ground for miscellaneous dashboard widgets that belong to another owning feature.

## Invariants

- The main feature remains a route-entry orchestration layer.
- Shared dashboard widgets stay with their owning feature or in `shared` if they are truly generic.
