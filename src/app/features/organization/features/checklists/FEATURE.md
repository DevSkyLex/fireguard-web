# Checklists Feature

## Purpose

Owns organization-scoped checklist template data and the checklist template library page.

This subfeature is responsible for:

- loading, filtering, creating, updating and archiving checklist templates,
- exposing checklist state (`ChecklistStore.ensureInspectionCreateOptionsLoaded`) to the
  inspections subfeature, whose list page provides it for the inspection-create sheet.

Checklists are **not** immutable after creation: `PATCH /api/organizations/{orgId}/checklists/{checklistId}`
lets a template's name, version and items be revised in place — only the identifier and creation
date stay fixed. An archived checklist stays readable and stays out of the inspection-create
selector (`ensureInspectionCreateOptionsLoaded` filters to `status: 'active'`), but the API does
not reject a `PATCH` on an archived checklist; the checklists page is expected to gate the edit
action on the row's own status once it exists, not rely on a backend refusal.

## Entry Points

- Routes: `checklists.routes.ts`
- Public API: none. The feature root barrel exports no symbol — internal code imports the
  `state`, `models` and `data-access` concern barrels directly, and the inspections subfeature
  reaches `ChecklistStore` and the checklist models through those same barrels rather than a root
  re-export.

## Routes

`/organizations/:organizationId/checklists` — the template library list, gated by
`organization.inspection.read`. There is no detail route: creation, editing and archiving are
list-scoped actions (`ChecklistCreateSheet`, `ChecklistEditDialog`, `ChecklistArchiveDialog`),
gated by `organization.inspection.write`.

## State and Data Access

Primary stores:

- `ChecklistStore` (component-scoped, provided once on the route leaf; list, create, update,
  archive)
- `ActiveChecklistStore` (root-provided; the single selected/resolved checklist, read by
  inspections' create flow and by a future checklist detail surface)

Primary service:

- `ChecklistService` — `list`, `get`, `create`, `update`, `archive`, `listStatuses`.

## Cross-Feature Dependencies

- May be consumed by sibling organization subfeatures such as inspections.
- Must stay owned here even when another subfeature uses checklist selection in its UI.

## Invariants

- Checklist ownership remains separate from inspections and facilities.
- Checklist state and mutations stay local to this subfeature.
- Consumers (e.g. inspections) reach checklists only through the feature's concern barrels
  (`state`, `models`, `data-access`), never a deep import.
- **`ChecklistsPage` is the full management surface.** It searches, filters by status, lists
  through `ChecklistTable`, and creates/edits/archives through the three dialogs above — every
  write action is gated by `organization.inspection.write`. Row status renders through the
  `models/checklist-status-tag/` registry, never as raw text.
- `UpdateChecklistInput`'s `items` field, when sent, is always a **full replacement list** — the
  backend rejects any `PATCH` (name, reference code, or items) once the checklist is referenced by
  an existing inspection, and rejects an item change specifically once the checklist is archived.
  `ChecklistEditForm` does not distinguish these cases in the UI yet; both surface as the generic
  conflict feedback from `ChecklistStore.updateFailed`.
- There is no restore endpoint (`ChecklistResource` exposes only `POST .../archive`), so the row
  menu offers Archive on an active checklist and nothing on an archived one.
- The checklist version is fixed at `1.0` on creation; there is no versioning UI yet. A checklist's
  `referenceCode` is part of the backend contract (`CreateChecklistInput`, `UpdateChecklistInput`)
  but is not yet exposed in `ChecklistCreateForm` / `ChecklistEditForm` — a future pass can add it
  once the product decides how it should read.
- A checklist template is created in `checklist-create-sheet` — its item list grows with the data, which `DESIGN.md` names as a surface that is never a dialog.
- **The sheet gates dismissal while the form is dirty.** `ChecklistCreateForm` reports its own dirtiness (name field, item draft row, or a staged item) through `dirtyChanged`; `checklist-create-sheet` holds it in a local `dirty` signal and routes Escape, the backdrop and the form's own Cancel through `requestClose()`, which raises `@shared/unsaved-changes` instead of closing.
