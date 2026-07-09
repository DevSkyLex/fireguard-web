# Checklists Feature

## Purpose

Owns organization-scoped checklist data used by organization workflows.

This subfeature is **data-only**: it owns the checklist store, service and
models, but no longer ships its own routed pages. The standalone checklist
management pages and nav entry were removed to declutter the field-agent
navigation; checklists now exist purely as inspection templates.

This subfeature is responsible for:

- loading, filtering, and selecting checklists,
- exposing checklist state (`ChecklistStore.ensureInspectionCreateOptionsLoaded`)
  to the inspections subfeature, which builds an inspection against a checklist.

Checklists are immutable after creation because the API does not expose an update endpoint.

## Entry Points

- Public API: `index.ts` (re-exports `state`, `models`, `data-access`)

No routes: the feature owns no `*.routes.ts` and no `ui/`.

## State and Data Access

Primary stores:

- `ChecklistStore`
- `ActiveChecklistStore`

Primary service:

- `ChecklistService`

## Cross-Feature Dependencies

- May be consumed by sibling organization subfeatures such as inspections.
- Must stay owned here even when another subfeature uses checklist selection in its UI.

## Invariants

- Checklist ownership remains separate from inspections and facilities.
- Checklist state and mutations stay local to this subfeature.
- Consumers (e.g. inspections) reach checklists only through the feature public
  API (`state`, `models`, `data-access`), never a deep import.
