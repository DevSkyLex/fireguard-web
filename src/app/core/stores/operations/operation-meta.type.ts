/**
 * Interface OperationMeta
 * @interface OperationMeta
 *
 * @description
 * Shared metadata for operations.
 *
 * @version 1.0.0
 */
export interface OperationMeta<TParams = never> {
  /**
   * Property params
   * @readonly
   *
   * @description
   * Parameters used to trigger the operation.
   *
   * @since 1.0.0
   *
   * @type {TParams | undefined}
   */
  readonly params?: TParams;

  /**
   * Property requestId
   * @readonly
   *
   * @description
   * Correlates requests to avoid race conditions.
   *
   * @since 1.0.0
   *
   * @type {string | undefined}
   */
  readonly requestId?: string;

  /**
   * Property startedAt
   * @readonly
   *
   * @description
   * Epoch time (ms) when the operation started.
   *
   * @since 1.0.0
   *
   * @type {number | undefined}
   */
  readonly startedAt?: number;

  /**
   * Property finishedAt
   * @readonly
   *
   * @description
   * Epoch time (ms) when the operation finished.
   *
   * @since 1.0.0
   *
   * @type {number | undefined}
   */
  readonly finishedAt?: number;

  /**
   * Property attempts
   * @readonly
   *
   * @description
   * Number of attempts made for this operation.
   *
   * @since 1.0.0
   *
   * @type {number | undefined}
   */
  readonly attempts?: number;
}
