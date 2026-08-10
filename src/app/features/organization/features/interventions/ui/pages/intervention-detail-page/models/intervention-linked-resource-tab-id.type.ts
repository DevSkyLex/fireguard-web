/**
 * The four tabs of the detail page's left-hand rail — the `hlm-tabs`
 * `tab`/`tabActivated` value. `overview` holds everything the page rendered
 * before this rail existed (readiness checklist, work items, changes,
 * attachments, activity, comments); the other three are drill-down lookups
 * into a sibling feature's records, each loaded by
 * `InterventionLinkedResourcesStore` on its own first activation.
 */
export type InterventionLinkedResourceTabId =
  | 'overview'
  | 'facilities'
  | 'equipment'
  | 'inspections';
