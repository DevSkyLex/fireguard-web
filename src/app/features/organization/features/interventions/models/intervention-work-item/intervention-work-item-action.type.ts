/**
 * Type InterventionWorkItemAction
 *
 * @description
 * Identifies the planned operation or discovery represented by an intervention work item.
 *
 * @type {InterventionWorkItemAction}
 */
export type InterventionWorkItemAction =
  | 'site_setup'
  | 'inventory'
  | 'inspection'
  | 'maintenance'
  | 'repair'
  | 'replacement';
