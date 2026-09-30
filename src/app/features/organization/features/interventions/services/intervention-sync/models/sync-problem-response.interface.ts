/**
 * Interface SyncProblemResponse
 * @interface SyncProblemResponse
 *
 * @description
 * Exposes the status and problem details used to classify a failed outbox replay.
 */
export interface SyncProblemResponse {
  /**
   * Property status
   * @readonly
   *
   * @description
   * Reports the current lifecycle status of this sync problem response.
   *
   * @access public
   *
   * @type {number}
   */
  readonly status?: number;

  /**
   * Property type
   * @readonly
   *
   * @description
   * Classifies this sync problem response for feature-specific handling.
   *
   * @access public
   *
   * @type {string}
   */
  readonly type?: string;

  /**
   * Property detail
   * @readonly
   *
   * @description
   * Provides the problem detail returned for the failed synchronization.
   *
   * @access public
   *
   * @type {string}
   */
  readonly detail?: string;

  /**
   * Property error
   * @readonly
   *
   * @description
   * Contains the wrapped problem type and detail returned by nested HTTP error bodies.
   *
   * @access public
   *
   * @type {{ readonly type?: string; readonly detail?: string }}
   */
  readonly error?: {
    readonly type?: string;
    readonly detail?: string;
  };
}
