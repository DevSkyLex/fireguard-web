/**
 * Type EquipmentLabelScope
 *
 * @description
 * Explicit inventory, facility or selected-record scope for printing at most 500 QR labels.
 *
 * @type EquipmentLabelScope
 */
export type EquipmentLabelScope =
  | { readonly kind: 'inventory' }
  | { readonly kind: 'facility'; readonly facilityId: string }
  | { readonly kind: 'selection'; readonly ids: readonly string[] };
