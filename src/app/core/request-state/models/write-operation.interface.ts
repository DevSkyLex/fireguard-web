/**
 * Interface WriteOperation
 * @interface WriteOperation
 *
 * @description
 * Identifies one immutable write intention across subscriptions, transport retries and durable
 * replay. A changed payload requires a new operation.
 */
export interface WriteOperation {
  /**
   * Property idempotencyKey
   * @readonly
   *
   * @description
   * Server receipt key generated before constructing the write observable.
   *
   * @type {string}
   */
  readonly idempotencyKey: string;
}
