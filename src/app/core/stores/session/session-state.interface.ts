import type { SessionOutput } from '@core/models/session';
import type { CollectionOperation, Operation } from '@core/stores/operations';

/**
 * Interface SessionState
 * @interface SessionState
 *
 * @description
 * State interface for the session store.
 * Manages user sessions list and session operations.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface SessionState {
  //#region Session Data
  /**
   * Property sessions
   * @readonly
   *
   * @description
   * List of user sessions.
   *
   * @since 1.0.0
   *
   * @type {ReadonlyArray<SessionOutput>}
   */
  readonly sessions: ReadonlyArray<SessionOutput>;

  /**
   * Property totalSessions
   * @readonly
   *
   * @description
   * Total count of sessions (for pagination).
   *
   * @since 1.0.0
   *
   * @type {number}
   */
  readonly totalSessions: number;
  //#endregion

  //#region Operations
  /**
   * Property listOperation
   * @readonly
   *
   * @description
   * Async operation state for listing sessions.
   *
   * @since 1.0.0
   *
   * @type {CollectionOperation<SessionOutput, unknown>}
   */
  readonly listOperation: CollectionOperation<SessionOutput, unknown>;

  /**
   * Property revokeOperation
   * @readonly
   *
   * @description
   * Async operation state for revoking a single session.
   *
   * @since 1.0.0
   *
   * @type {Operation<void, unknown>}
   */
  readonly revokeOperation: Operation<void, unknown>;

  /**
   * Property revokeAllOperation
   * @readonly
   *
   * @description
   * Async operation state for revoking all sessions.
   *
   * @since 1.0.0
   *
   * @type {Operation<void, unknown>}
   */
  readonly revokeAllOperation: Operation<void, unknown>;
  //#endregion
}
