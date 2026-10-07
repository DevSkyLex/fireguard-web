/**
 * Interface DeclareInventoryConsumptionInput
 * @interface DeclareInventoryConsumptionInput
 *
 * @description
 * Immutable physical consumption intent keeps the same UUID and decimal text through retries.
 *
 * @since unreleased
 */
export interface DeclareInventoryConsumptionInput {
  /**
   * Property clientOperationId
   * @readonly
   *
   * @description
   * Stable UUID generated once for this physical declaration.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly clientOperationId: string;

  /**
   * Property partId
   * @readonly
   *
   * @description
   * Part or consumable reference identity.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly partId: string;

  /**
   * Property warehouseId
   * @readonly
   *
   * @description
   * Physical source warehouse identity.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly warehouseId: string;

  /**
   * Property quantity
   * @readonly
   *
   * @description
   * Exact positive decimal quantity, with at most six fractional digits.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly quantity: string;

  /**
   * Property interventionId
   * @readonly
   *
   * @description
   * Intervention owning the declared physical usage.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly interventionId: string;

  /**
   * Property workItemId
   * @readonly
   *
   * @description
   * Optional execution work item.
   *
   * @access public
   * @since unreleased
   *
   * @type {string | null | undefined}
   */
  readonly workItemId?: string | null;

  /**
   * Property equipmentId
   * @readonly
   *
   * @description
   * Optional equipment affected by the work.
   *
   * @access public
   * @since unreleased
   *
   * @type {string | null | undefined}
   */
  readonly equipmentId?: string | null;

  /**
   * Property occurredAt
   * @readonly
   *
   * @description
   * ISO timestamp of the real usage, preserved during replay.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly occurredAt: string;
}
