import type { CallState } from '@core/request-state';
import type { ImportJobOutput } from '@features/organization/features/imports/models';

/**
 * Interface ImportJobsState
 * @interface ImportJobsState
 *
 * @description
 * Auxiliary state for {@link ImportJobsStore}. Entity state (`jobEntities`,
 * `jobEntityMap`, `jobIds`) is initialised by `withEntities` and lives
 * outside this interface.
 *
 * @since 1.0.0
 */
export interface ImportJobsState {
  /**
   * Property visibleIds
   * @readonly
   *
   * @description
   * Lists ids currently visible in the rendered collection.
   *
   * @access public
   *
   * @type {readonly string[]}
   */
  readonly visibleIds: readonly string[];

  /**
   * Property pollCallStates
   * @readonly
   *
   * @description
   * Tracks each active polling request by resource id.
   *
   * @access public
   *
   * @type {Readonly<Record<string, CallState>>}
   */
  readonly pollCallStates: Readonly<Record<string, CallState>>;

  /**
   * Property confirmCallStates
   * @readonly
   *
   * @description
   * Tracks confirmation requests by resource id.
   *
   * @access public
   *
   * @type {Readonly<Record<string, CallState>>}
   */
  readonly confirmCallStates: Readonly<Record<string, CallState>>;

  /**
   * Property templateCallState
   * @readonly
   *
   * @description
   * Tracks the request state for template.
   *
   * @access public
   *
   * @type {CallState}
   */
  readonly templateCallState: CallState;

  /**
   * Property resumeCallStates
   * @readonly
   *
   * @description
   * Tracks resume requests by resource id.
   *
   * @access public
   *
   * @type {Readonly<Record<string, CallState>>}
   */
  readonly resumeCallStates: Readonly<Record<string, CallState>>;

  /**
   * Property listCallState
   * @readonly
   *
   * @description
   *
   * @access public
   *
   * @type {CallState<null>}
   */
  readonly listCallState: CallState<null>;

  /**
   * Property totalJobs
   * @readonly
   *
   * @description
   *
   * @access public
   *
   * @type {number}
   */
  readonly totalJobs: number;

  /**
   * Property createCallState
   * @readonly
   *
   * @description
   * upload form can read what was just accepted; the row itself lives in
   * the entity collection and is kept current by {@link ImportJobsStore.poll}.
   *
   * @access public
   *
   * @type {CallState<ImportJobOutput>}
   */
  readonly createCallState: CallState<ImportJobOutput>;
}
