import type { EquipmentStatus } from '@features/organization/features/equipments/models';
import type { TagDescriptor } from '@shared/components';

/**
 * Interface EquipmentStatusOption
 *
 * @description
 * Option rendered by the facility equipment status filter and badge. Extends
 * the shared {@link TagDescriptor} (`label`, `severity`, `icon`) so it can be
 * forwarded directly to `<app-tag>`, and adds the API `value` forwarded to the
 * equipment list filter.
 *
 * @since 1.0.0
 */
export interface EquipmentStatusOption extends TagDescriptor {
  /**
   * Property value
   * @readonly
   *
   * @description
   * Equipment status value forwarded to the equipment API.
   *
   * @type {EquipmentStatus}
   */
  readonly value: EquipmentStatus;
}
