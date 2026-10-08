/**
 * Interface ReconcileProcurementReturnInput
 * @interface ReconcileProcurementReturnInput
 *
 * @description
 * Explicit reconciliation attempt, distinct from the immutable physical return declaration.
 */
export interface ReconcileProcurementReturnInput {
  /**
   * Property clientOperationId
   * @readonly
   *
   * @description
   * Stable UUID for identical retries of this reconciliation attempt.
   *
   * @access public
   *
   * @type {string}
   */
  readonly clientOperationId: string;
}
