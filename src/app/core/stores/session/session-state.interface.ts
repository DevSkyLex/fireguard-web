import type { Operation } from '@core/stores/operations';

/**
 * Interface SessionState
 * @interface SessionState
 *
 * @description
 * Component-scoped state for the session list store. Entities are managed
 * by the `withEntities` feature (providing `sessionEntities`,
 * `sessionEntityMap`, `sessionIds`). This interface tracks auxiliary state:
 * list loading flag, total count for pagination, and mutation operation
 * tracking.
 *
 * @version 2.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface SessionState {
  //#region Properties
  /**
   * Property totalSessions
   * @readonly
   *
   * @description
   * Server-reported total count of sessions for the current query.
   * Updated on every successful list response and decremented on
   * revoke/revokeAll success.
   *
   * @since 1.0.0
   *
   * @type {number}
   */
  readonly totalSessions: number;

  /**
   * Property isLoading
   * @readonly
   *
   * @description
   * True while a list request is in-flight. Set to `true` at the start of
   * every `load` / `loadSessions` call and back to `false` on both
   * success and error.
   *
   * @since 2.0.0
   *
   * @type {boolean}
   */
  readonly isLoading: boolean;

  /**
   * Property revokeOperation
   * @readonly
   *
   * @description
   * Loading / success / error state for the revoke single session
   * operation. Starts idle and transitions through loading → success | error
   * when {@link SessionStore#revoke} is called.
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
   * Loading / success / error state for the revoke all sessions
   * operation. Starts idle and transitions through loading → success | error
   * when {@link SessionStore#revokeAll} is called.
   *
   * @since 1.0.0
   *
   * @type {Operation<void, unknown>}
   */
  readonly revokeAllOperation: Operation<void, unknown>;
  //#endregion
}
