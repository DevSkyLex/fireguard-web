import type { MaintenanceOperationKind } from './maintenance-operation-kind.type';

/**
 * Interface CreateMaintenancePlanInput
 * @interface CreateMaintenancePlanInput
 *
 * @description
 * Prepares an inactive equipment operation for date preview before activation.
 */
export interface CreateMaintenancePlanInput {
  /**
   * Property equipmentId
   * @readonly
   *
   * @description
   * Equipment selected from the authorized organization.
   *
   * @since unreleased
   *
   * @type {string}
   */
  readonly equipmentId: string;
  /**
   * Property name
   * @readonly
   *
   * @description
   * Operation name.
   *
   * @since unreleased
   *
   * @type {string}
   */
  readonly name: string;
  /**
   * Property operationKind
   * @readonly
   *
   * @description
   * Kind remains immutable after creation.
   *
   * @since unreleased
   *
   * @type {MaintenanceOperationKind}
   */
  readonly operationKind: MaintenanceOperationKind;
  /**
   * Property interval
   * @readonly
   *
   * @description
   * Positive ISO calendar duration.
   *
   * @since unreleased
   *
   * @type {string}
   */
  readonly interval: string;
  /**
   * Property anchorAt
   * @readonly
   *
   * @description
   * Calendar anchor instant.
   *
   * @since unreleased
   *
   * @type {string}
   */
  readonly anchorAt?: string;
  /**
   * Property anchorOn
   * @readonly
   *
   * @description
   * Calendar date interpreted in the server-owned plan timezone, without browser conversion.
   *
   * @since unreleased
   *
   * @type {string}
   */
  readonly anchorOn?: string;
  /**
   * Property nextDueAt
   * @readonly
   *
   * @description
   * Optional explicit first deadline.
   *
   * @since unreleased
   *
   * @type {string}
   */
  readonly nextDueAt?: string;
  /**
   * Property nextDueOn
   * @readonly
   *
   * @description
   * Optional first calendar deadline interpreted by the server.
   *
   * @since unreleased
   *
   * @type {string}
   */
  readonly nextDueOn?: string;
}

/**
 * Interface UpdateMaintenancePlanInput
 * @interface UpdateMaintenancePlanInput
 *
 * @description
 * Configurable plan fields; equipment and operation kind are immutable.
 */
export interface UpdateMaintenancePlanInput {
  /**
   * Property name
   * @readonly
   *
   * @description
   * Replacement operation name.
   *
   * @since unreleased
   *
   * @type {string}
   */
  readonly name?: string;
  /**
   * Property interval
   * @readonly
   *
   * @description
   * Configured calendar duration.
   *
   * @since unreleased
   *
   * @type {string}
   */
  readonly interval?: string;
  /**
   * Property anchorAt
   * @readonly
   *
   * @description
   * Updated calendar anchor.
   *
   * @since unreleased
   *
   * @type {string}
   */
  readonly anchorAt?: string;
  /**
   * Property anchorOn
   * @readonly
   *
   * @description
   * Updated anchor day in the plan's preserved timezone.
   *
   * @since unreleased
   *
   * @type {string}
   */
  readonly anchorOn?: string;
  /**
   * Property nextDueAt
   * @readonly
   *
   * @description
   * Explicit first or next due date.
   *
   * @since unreleased
   *
   * @type {string}
   */
  readonly nextDueAt?: string;
  /**
   * Property nextDueOn
   * @readonly
   *
   * @description
   * Explicit initial deadline day in the plan's preserved timezone.
   *
   * @since unreleased
   *
   * @type {string}
   */
  readonly nextDueOn?: string;
  /**
   * Property active
   * @readonly
   *
   * @description
   * Explicit activation after date review.
   *
   * @since unreleased
   *
   * @type {boolean}
   */
  readonly active?: boolean;
}
