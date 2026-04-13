# Checklists Feature

## Purpose

Owns organization-scoped checklist data used by organization workflows.

This subfeature is responsible for:

- listing and selecting checklists,
- checklist creation and archive behavior,
- exposing checklist state to other organization subfeatures that need checklist inputs.

This subfeature currently acts primarily as a supporting business capability for other organization workflows such as inspections.

## Entry Points

- Public API: `index.ts`

There is no dedicated route file at this level today.

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
- If checklist routes are introduced later, they must be added here rather than documented only through a consumer feature.
