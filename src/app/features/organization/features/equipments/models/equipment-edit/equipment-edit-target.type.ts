/**
 * Type EquipmentEditTarget
 *
 * @description
 * The equipment properties `UpdateEquipmentInput` accepts, each edited where
 * it is displayed (`ARCHITECTURE.md` §10.5).
 *
 * @since 1.0.0
 */
export type EquipmentEditTarget =
  | 'type'
  | 'subType'
  | 'brand'
  | 'model'
  | 'serialNumber'
  | 'locationLabel';
