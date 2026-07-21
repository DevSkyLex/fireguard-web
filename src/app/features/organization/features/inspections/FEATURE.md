# Inspections Feature

## Purpose

Owns organization-scoped inspection workflows.

This subfeature is responsible for:

- listing inspections for the active organization,
- inspection creation, draft editing, detail, and cancellation,
- submission and closure lifecycle actions,
- non-conformity creation, detail, listing, and status updates,
- active inspection state,
- orchestration of inspection forms and inspection page flows.

This subfeature does not own facility, equipment, or checklist data, even when inspection pages need those inputs.

## Entry Points

- Routes: `inspections.routes.ts`
- Public API: `index.ts`

## Routes

- `/organizations/:organizationId/inspections`
- `/organizations/:organizationId/inspections/create`
- `/organizations/:organizationId/inspections/:inspectionId`
- `/organizations/:organizationId/inspections/:inspectionId/edit`

Inspection detail routes resolve active inspection context before rendering. The API delete
operation represents cancellation and is exposed as such in the UI.

## State and Data Access

Primary stores:

- `InspectionStore`
- `ActiveInspectionStore`

Primary service:

- `InspectionService`

## Cross-Feature Dependencies

- Depends on organization route context from the parent feature.
- May compose facility, equipment, and checklist data as supporting inputs for inspection workflows.
- Must not absorb ownership of those sibling subfeatures just because the create flow depends on them.
- Consumed by the sibling `compliance` subfeature: its Inspections and
  Non-conformities tabs call this feature's public `InspectionService`
  (`list`, `listOrganizationNonConformities`) and its non-conformity tag
  registry (`resolveInspectionTag`, `inspectionTagOptions`) read-only, through
  the `data-access`/`models` public barrels — never a deep import. Ownership
  of inspection and non-conformity data, and of the tag registry, stays here.

## Invariants

- Inspection pages remain the orchestrators of inspection workflows.
- Supporting dropdown or selector data from sibling subfeatures is consumed, not re-owned.
- Inspection business rules and mutation flows remain local to this subfeature.
- Only draft inspections can be edited, submitted, or cancelled; submitted inspections can be closed.
