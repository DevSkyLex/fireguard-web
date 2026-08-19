import type { HydraItem } from '@core/api/models';

/**
 * Type EquipmentMaintenanceLogSource
 *
 * @description
 * What triggered a maintenance log entry: an automatic lifecycle status
 * transition, or work performed during an intervention.
 */
export type EquipmentMaintenanceLogSource = 'status_transition' | 'intervention';

/**
 * Interface EquipmentMaintenanceLogOutput
 * @interface EquipmentMaintenanceLogOutput
 *
 * @description
 * Read model returned by equipment maintenance log endpoints. Every field
 * below `completedAt` is optional on the wire — API Platform omits a null
 * field rather than sending it, so an absent property arrives as
 * `undefined`, never `null`.
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

  /**
   * Property source
   * @readonly
   *
   * @description
   * What triggered this entry.
   *
   * @type {EquipmentMaintenanceLogSource}
   */
  readonly source: EquipmentMaintenanceLogSource;

  /**
   * Property interventionId
   * @readonly
   *
   * @description
   * The intervention this entry was recorded from, when `source` is
   * `'intervention'`.
   *
   * @type {string | undefined}
   */
  readonly interventionId?: string;

  /**
   * Property interventionNumber
   * @readonly
   *
   * @description
   * The linked intervention's display number, rendered as `FG-{number}`.
   *
   * @type {number | undefined}
   */
  readonly interventionNumber?: number;

  /**
   * Property workItemAction
   * @readonly
   *
   * @description
   * The work item action performed, when this entry came from an
   * intervention work item.
   *
   * @type {string | undefined}
   */
  readonly workItemAction?: string;

  /**
   * Property actorId
   * @readonly
   *
   * @description
   * The member who performed or triggered this entry, when known.
   *
   * @type {string | undefined}
   */
  readonly actorId?: string;

  /**
   * Property summary
   * @readonly
   *
   * @description
   * A short human-readable description of what happened.
   *
   * @type {string | undefined}
   */
  readonly summary?: string;
  //#endregion
}
