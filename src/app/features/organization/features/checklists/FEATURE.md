# Checklists Feature

## Purpose

Owns organization-scoped checklist template data and the checklist template library page.

This subfeature is responsible for:

- loading, filtering, creating, updating and archiving checklist templates,
- exposing checklist state (`ChecklistStore.ensureInspectionCreateOptionsLoaded`) to the
  inspections subfeature, whose list page provides it for the inspection-create sheet.

Active checklists expose independent server capabilities for metadata and item changes.
Inspection references, including drafts, freeze the items; archived templates are read-only.
A new revision is a separate checklist linked by `previousChecklistId`, with a new version
and optional unique reference. Existing inspections retain the previous checklist.

## Entry Points

- Routes: `checklists.routes.ts`
- Public API: none. The feature root barrel exports no symbol — internal code imports the
  `state`, `models` and `data-access` concern barrels directly, and the inspections subfeature
  reaches `ChecklistStore` and the checklist models through those same barrels rather than a root
  re-export.

## Routes

- `/organizations/:organizationId/checklists`: searchable library, gated by `organization.inspection.read`.
- `/organizations/:organizationId/checklists/new`: creation page, write-gated.
- `/organizations/:organizationId/checklists/:checklistId`: editor for active writable checklists;
  consultation for archives and readers. Both editor routes protect unsaved changes.

## State and Data Access

Primary stores:

- `ChecklistStore` (component-scoped, provided once on the route leaf; list, create, update,
  archive)
- `ActiveChecklistStore` (root-provided; the single selected/resolved checklist, read by
  inspections' create flow; the detail page provides its own scoped instance)

Primary service:

- `ChecklistService` — `list`, `get`, `create`, `update`, `archive`.

## Cross-Feature Dependencies

- May be consumed by sibling organization subfeatures such as inspections.
- Must stay owned here even when another subfeature uses checklist selection in its UI.

## Invariants

- Mobile touch targets and card composition follow the central interaction-capabilities contract; width only
  reflows the editor fields. The routed editor keeps one Signal Form, including unfinished
  item drafts and keyboard reorder controls, across orientation and interaction mode changes.

- Checklist ownership remains separate from inspections and facilities.
- Checklist state and mutations stay local to this subfeature.
- Consumers (e.g. inspections) reach checklists only through the feature's concern barrels
  (`state`, `models`, `data-access`), never a deep import.
- `ChecklistsPage` searches, filters and archives through a confirmation dialog. Creation and
  editing navigate to the dedicated editor. Every write is gated by inspection write permission.
- The editor sends only changed PATCH fields. `items`, when changed and authorized, is a
  full replacement. Metadata-only updates never regenerate item identities.
- The detail page exposes version/reference and a previous-revision link. Authorized users
  create revisions within the same protected editor. The unique reference is cleared and
  a new version is required; the original template remains unchanged.
- Server capabilities are authoritative; presentation permission checks are only an additional
  guard. Conflict or network failures retain the full draft and allow correction/retry.
- Archived checklists may seed a new revision when authorized, but cannot be edited or restored.
- The editor includes an unfinished, valid item draft when saving. Invalid item text and
  server errors preserve the complete draft. Inline labels and keyboard reorder controls
  operate on the full replacement list; no drag-only reordering.
- Drafts and pending submissions guard navigation and browser unload. Successful writes
  reset the baseline; failed writes leave the editor intact. Archives are read-only.
- Detail data loads browser-only with explicit skeleton and retry states; no authenticated
  checklist payload is serialized into SSR transfer state.
