/**
 * Interface IndividualizeReceiptInput
 * @interface IndividualizeReceiptInput
 *
 * @description
 * Explicit confirmation to create reserve equipment for received material.
 */
export interface IndividualizeReceiptInput {
  /**
   * Property clientOperationId
   * @readonly
   *
   * @description
   * Stable UUID retained across response-loss replay.
   *
   * @access public
   *
   * @type {string}
   */
  readonly clientOperationId: string;
}
