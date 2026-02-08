/**
 * Interface OperationFailureEventPayload
 *
 * @description
 * Normalized payload for domain error events
 * dispatched by stores.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface OperationFailureEventPayload {
  //#region Properties
  /**
   * Property message
   * @readonly
   *
   * @description
   * User-facing error message.
   *
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly message: string;

  /**
   * Property code
   * @readonly
   *
   * @description
   * Optional error code for programmatic
   * handling.
   *
   * @since 1.0.0
   *
   * @type {string | number | null}
   */
  readonly code: string | number | null;

  /**
   * Property retryable
   * @readonly
   *
   * @description
   * Indicates if the operation can be retried.
   *
   * @since 1.0.0
   *
   * @type {boolean}
   */
  readonly retryable: boolean;

  /**
   * Property timestamp
   * @readonly
   *
   * @description
   * Timestamp when the error occurred, represented
   * in epoch milliseconds.
   *
   * @since 1.0.0
   *
   * @type {number}
   */
  readonly timestamp: number;
  //#endregion
}

