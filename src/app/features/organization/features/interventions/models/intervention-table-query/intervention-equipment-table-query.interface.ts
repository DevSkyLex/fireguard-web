import type {
  EquipmentStatus,
  EquipmentType,
} from '@features/organization/features/equipments/models';

/**
 * Interface InterventionEquipmentTableQuery
 * @interface InterventionEquipmentTableQuery
 *
 * @description
 * Controlled criteria for linked equipment, retained in page state.
 *
 * @since 6.2.0
 */
export interface InterventionEquipmentTableQuery {
  /**
   * Property search
   * @readonly
   *
   * @description
   * Contains the text used to filter the linked-resource list.
   *
   * @access public
   *
   * @type {string}
   */
  readonly search: string;

  /**
   * Property type
   * @readonly
   *
   * @description
   * Classifies this intervention equipment table for feature-specific handling.
   *
   * @access public
   *
   * @type {EquipmentType | null}
   */
  readonly type: EquipmentType | null;

  /**
   * Property status
   * @readonly
   *
   * @description
   * Reports the current lifecycle status of this intervention equipment table.
   *
   * @access public
   *
   * @type {EquipmentStatus | null}
   */
  readonly status: EquipmentStatus | null;
}
