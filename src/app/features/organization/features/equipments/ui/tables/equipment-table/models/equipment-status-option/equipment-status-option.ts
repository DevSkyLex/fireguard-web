import type { EquipmentStatus } from '@features/organization/features/equipments/models';
import type { TagDescriptor } from '@shared/components';

/**
 * Interface EquipmentStatusOption
 * @interface EquipmentStatusOption
 *
 * @description
 * Visual configuration used to render and filter equipment lifecycle status
 * values consistently across table badges and filter options. Extends the
 * shared {@link TagDescriptor} (`label`, `severity`, `icon`) so it can be
 * forwarded directly to `<app-tag>`, and adds the API `value` forwarded in
 * list filters.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface EquipmentStatusOption extends TagDescriptor {
  //#region Properties
  /**
   * Property value
   * @readonly
   *
   * @description
   * API status value forwarded in list filters.
   *
   * @type {EquipmentStatus}
   */
  readonly value: EquipmentStatus;
  //#endregion
}
