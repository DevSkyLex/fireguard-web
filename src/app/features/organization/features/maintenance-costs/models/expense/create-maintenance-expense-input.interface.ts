/**
 * Interface CreateMaintenanceExpenseInput
 * @interface CreateMaintenanceExpenseInput
 *
 * @description
 * A stable expense declaration or motivated signed correction, preserved across retries.
 */
export interface CreateMaintenanceExpenseInput {
  /**
   * Property clientId
   * @readonly
   *
   * @description
   * Stable idempotency identifier generated once per declaration.
   *
   * @access public
   *
   * @type {string}
   */
  readonly clientId: string;

  /**
   * Property amount
   * @readonly
   *
   * @description
   * Exact signed decimal string with at most six fractional digits.
   *
   * @access public
   *
   * @type {string}
   */
  readonly amount: string;

  /**
   * Property description
   * @readonly
   *
   * @description
   * Required motivation for the operational expense or correction.
   *
   * @access public
   *
   * @type {string}
   */
  readonly description: string;

  /**
   * Property incurredAt
   * @readonly
   *
   * @description
   * Actual expense timestamp with an explicit offset.
   *
   * @access public
   *
   * @type {string}
   */
  readonly incurredAt: string;

  /**
   * Property workItemId
   * @readonly
   *
   * @description
   * Optional task associated with the expense.
   *
   * @access public
   *
   * @type {string | null}
   */
  readonly workItemId?: string | null;

  /**
   * Property adjustmentOf
   * @readonly
   *
   * @description
   * Original expense UUID required for a negative adjustment.
   *
   * @access public
   *
   * @type {string | null}
   */
  readonly adjustmentOf?: string | null;
}
