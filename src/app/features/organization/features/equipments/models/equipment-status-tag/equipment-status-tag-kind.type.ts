/**
 * Type EquipmentStatusTagKind
 *
 * @description
 * Discriminator for every equipment enum that renders as a status indicator.
 * Named `-status-tag`, not `-tag`, because `equipment-tag/` already names the
 * unrelated labeling-tag resource (`EquipmentTagOutput`).
 *
 * @since 1.0.0
 */
export type EquipmentStatusTagKind = 'status' | 'maintenanceDueStatus';
