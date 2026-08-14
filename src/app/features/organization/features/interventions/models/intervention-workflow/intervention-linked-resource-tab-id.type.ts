/**
 * The six tabs of the detail page's left-hand rail — the `hlm-tabs`
 * `tab`/`tabActivated` value. `overview` holds the readiness checklist, the
 * work-item table, the activity thread and the comment form; `changes` and
 * `attachments` are lazily-mounted panels over data the workspace already
 * loads with the rest of the page; `facilities`, `equipment` and
 * `inspections` are drill-down lookups into a sibling feature's records,
 * each fetched by `InterventionLinkedResourcesStore` on its own first
 * activation.
 */
export type InterventionLinkedResourceTabId =
  | 'overview'
  | 'changes'
  | 'attachments'
  | 'facilities'
  | 'equipment'
  | 'inspections';
