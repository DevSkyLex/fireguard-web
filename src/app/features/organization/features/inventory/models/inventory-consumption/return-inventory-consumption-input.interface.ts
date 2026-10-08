/**
 * Interface ReturnInventoryConsumptionInput
 * @interface ReturnInventoryConsumptionInput
 *
 * @description
 * An explicit physical return creates a compensating movement without rewriting the consumption.
 *
 * @since unreleased
 */
export interface ReturnInventoryConsumptionInput {
  /**
   * Property clientOperationId
   * @readonly
   *
   * @description
   * Stable UUID preserved through uncertain network responses.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly clientOperationId: string;

  /**
   * Property consumptionId
   * @readonly
   *
   * @description
   * Original confirmed consumption identity.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly consumptionId: string;

  /**
   * Property quantity
   * @readonly
   *
   * @description
   * Exact positive quantity returned to stock.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly quantity: string;

  /**
   * Property reason
   * @readonly
   *
   * @description
   * Recorded factual return reason, limited to 2000 characters.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly reason: string;
}
