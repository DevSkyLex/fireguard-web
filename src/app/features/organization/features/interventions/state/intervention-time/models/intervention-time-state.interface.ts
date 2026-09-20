import type { CallState } from '@core/request-state';
import type {
  InterventionTimeDraft,
  InterventionTimeScope,
} from '@features/organization/features/interventions/models';

/**
 * Interface InterventionTimeState
 * @interface InterventionTimeState
 *
 * @description
 * Explicit independent journal reads, writes and local draft persistence.
 *
 * @since 1.0.0
 */
export interface InterventionTimeState {
  /**
   * Property scope
   * @readonly
   *
   * @description
   * Authorized journal context.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InterventionTimeScope | null}
   */
  readonly scope: InterventionTimeScope | null;

  /**
   * Property readCallState
   * @readonly
   *
   * @description
   * Independent journal loading state.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {CallState}
   */
  readonly readCallState: CallState;

  /**
   * Property writeCallState
   * @readonly
   *
   * @description
   * Time entry mutation state.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {CallState}
   */
  readonly writeCallState: CallState;

  /**
   * Property draftCallState
   * @readonly
   *
   * @description
   * Durable device storage state.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {CallState}
   */
  readonly draftCallState: CallState;

  /**
   * Property draft
   * @readonly
   *
   * @description
   * Latest user input, retained in memory even when device persistence fails.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InterventionTimeDraft | null}
   */
  readonly draft: InterventionTimeDraft | null;

  /**
   * Property offline
   * @readonly
   *
   * @description
   * Whether this journal was read from local storage.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {boolean}
   */
  readonly offline: boolean;

  /**
   * Property historyUnavailable
   * @readonly
   *
   * @description
   * Distinguishes absent offline history from a genuinely empty journal.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {boolean}
   */
  readonly historyUnavailable: boolean;
}
