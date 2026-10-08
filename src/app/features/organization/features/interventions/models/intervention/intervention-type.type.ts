/**
 * Type InterventionType
 *
 * @description
 * Identifies the operational objective of an intervention, including preventive and corrective
 * work.
 *
 * @type {InterventionType}
 */
export type InterventionType =
  | 'site_setup'
  | 'inventory'
  | 'inspection_campaign'
  | 'preventive_maintenance'
  | 'corrective_maintenance';
