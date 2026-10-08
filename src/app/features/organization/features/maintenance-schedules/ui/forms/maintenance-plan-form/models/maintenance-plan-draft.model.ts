import type { MaintenanceOperationKind } from '@features/organization/features/maintenance-schedules/models';

/**
 * Interface MaintenancePlanDraft
 * @interface MaintenancePlanDraft
 *
 * @description
 * Explicit calendar configuration; no equipment type implies a regulatory frequency.
 */
export interface MaintenancePlanDraft {
  /**
   * Property equipmentId
   *
   * @description
   * Selected equipment identity.
   *
   * @since unreleased
   *
   * @type {string}
   */
  equipmentId: string;
  /**
   * Property name
   *
   * @description
   * Operation label.
   *
   * @since unreleased
   *
   * @type {string}
   */
  name: string;
  /**
   * Property operationKind
   *
   * @description
   * Control or independent maintenance.
   *
   * @since unreleased
   *
   * @type {MaintenanceOperationKind}
   */
  operationKind: MaintenanceOperationKind;
  /**
   * Property every
   *
   * @description
   * Positive calendar interval multiplier.
   *
   * @since unreleased
   *
   * @type {number}
   */
  every: number;
  /**
   * Property unit
   *
   * @description
   * Explicit ISO calendar unit, unset on a new draft.
   *
   * @since unreleased
   *
   * @type {string}
   */
  unit: string;
  /**
   * Property anchorDate
   *
   * @description
   * Calendar anchor date.
   *
   * @since unreleased
   *
   * @type {string}
   */
  anchorDate: string;
  /**
   * Property firstDueDate
   *
   * @description
   * Optional explicit first deadline.
   *
   * @since unreleased
   *
   * @type {string}
   */
  firstDueDate: string;
}
