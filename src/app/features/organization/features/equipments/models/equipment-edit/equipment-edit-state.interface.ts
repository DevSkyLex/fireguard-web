import type { EquipmentEditTarget } from './equipment-edit-target.type';

/**
 * Interface EquipmentEditState
 * @interface
 *
 * @description
 * Which in-place field is open, writing, or showing a rejection. The page
 * owns all four, so "one field open at a time" is structural and a
 * rejection is attributed to the one field that caused it.
 *
 * @since 1.0.0
 */
export interface EquipmentEditState {
  /**
   * Property open
   * @readonly
   *
   * @description
   * Identifies the record currently being edited, when one exists.
   *
   * @access public
   *
   * @type {EquipmentEditTarget | null}
   */
  readonly open: EquipmentEditTarget | null;

  /**
   * Property saving
   * @readonly
   *
   * @description
   * Identifies the record whose changes are currently being saved, when one exists.
   *
   * @access public
   *
   * @type {EquipmentEditTarget | null}
   */
  readonly saving: EquipmentEditTarget | null;

  /**
   * Property failed
   * @readonly
   *
   * @description
   * Identifies the record whose latest save failed, when one exists.
   *
   * @access public
   *
   * @type {EquipmentEditTarget | null}
   */
  readonly failed: EquipmentEditTarget | null;

  /**
   * Property failure
   * @readonly
   *
   * @description
   * Contains the normalized error from the latest edit operation, when one exists.
   *
   * @access public
   *
   * @type {string | null}
   */
  readonly failure: string | null;
}
