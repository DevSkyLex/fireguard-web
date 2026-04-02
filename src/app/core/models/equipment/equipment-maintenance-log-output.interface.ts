import type { HydraItem } from '@core/models/api';

/**
 * Interface EquipmentMaintenanceLogOutput
 * @interface EquipmentMaintenanceLogOutput
 *
 * @description
 * Read model returned by equipment maintenance log endpoints.
 */
export interface EquipmentMaintenanceLogOutput extends HydraItem {
  //#region Properties
  /**
   * Property id
   * @readonly
   *
   * @description
   * Unique identifier of the maintenance log entry.
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property equipmentId
   * @readonly
   *
   * @description
   * Identifier of the equipment concerned by the
   * maintenance operation.
   *
   * @type {string}
   */
  readonly equipmentId: string;

  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Identifier of the organization owning the equipment.
   *
   * @type {string}
   */
  readonly organizationId: string;

  /**
   * Property startedAt
   * @readonly
   *
   * @description
   * Timestamp at which maintenance started.
   *
   * @type {string}
   */
  readonly startedAt: string;

  /**
   * Property completedAt
   * @readonly
   *
   * @description
   * Timestamp at which maintenance completed.
   *
   * @type {string | null | undefined}
   */
  readonly completedAt?: string | null;
  //#endregion
}
