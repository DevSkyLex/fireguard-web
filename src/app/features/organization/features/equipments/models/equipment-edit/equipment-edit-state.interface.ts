import type { EquipmentEditTarget } from './equipment-edit-target.type';

/**
 * Interface EquipmentEditState
 *
 * @description
 * Which in-place field is open, writing, or showing a rejection. The page
 * owns all four, so "one field open at a time" is structural and a
 * rejection is attributed to the one field that caused it.
 *
 * @since 1.0.0
 */
export interface EquipmentEditState {
  readonly open: EquipmentEditTarget | null;
  readonly saving: EquipmentEditTarget | null;
  readonly failed: EquipmentEditTarget | null;
  readonly failure: string | null;
}
