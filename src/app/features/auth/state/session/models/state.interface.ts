import type { CallState } from '@core/state/request-state';

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
   * Property listCallState
   * @readonly
   *
   * @description
   * Tracks the loading state of the session list.
   *
   * @since 2.0.0
   *
   * @type {CallState}
   */
  readonly listCallState: CallState;

  /**
   * Property revokeCallState
   * @readonly
   *
   * @description
   * Call state for the revoke single session operation.
   *
   * @since 1.0.0
   *
   * @type {CallState}
   */
  readonly revokeCallState: CallState;

  /**
   * Property revokeAllCallState
   * @readonly
   *
   * @description
   * Call state for the revoke all sessions operation.
   *
   * @since 1.0.0
   *
   * @type {CallState}
   */
  readonly revokeAllCallState: CallState;
  //#endregion
}
