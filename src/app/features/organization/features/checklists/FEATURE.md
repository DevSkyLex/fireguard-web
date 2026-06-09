# Checklists Feature

## Purpose

Owns organization-scoped checklist data used by organization workflows.

This subfeature is responsible for:

- listing, filtering, and selecting checklists,
- checklist creation with dynamic lines,
- checklist detail and archive behavior,
- exposing checklist state to other organization subfeatures that need checklist inputs.

Checklists are immutable after creation because the API does not expose an update endpoint.

## Entry Points

- Public API: `index.ts`
- Routes: `checklists.routes.ts`

## Routes

- `/organizations/:organizationId/checklists`
- `/organizations/:organizationId/checklists/create`
- `/organizations/:organizationId/checklists/:checklistId`

Checklist routes reuse inspection read/write permissions because the API does not expose
checklist-specific permissions.

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
- Checklist detail routes resolve active checklist context before rendering.
