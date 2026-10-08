import type { CallState } from '@core/request-state';
import type {
  InterventionTimeDraft,
  InterventionTimeScope,
  InterventionTimeEntryVersionsOutput,
  InterventionTimeEntryView,
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
   * Property persistedDraft
   * @readonly
   *
   * @description
   * Last confirmed device snapshot, compared with the latest input before warning about reload.
   *
   * @access public
   * @since unreleased
   *
   * @type {InterventionTimeDraft | null}
   */
  readonly persistedDraft: InterventionTimeDraft | null;

  /**
   * Property draftPersistenceFailed
   * @readonly
   *
   * @description
   * Retains a local persistence failure through retry until the latest input becomes durable.
   *
   * @access public
   * @since unreleased
   *
   * @type {boolean}
   */
  readonly draftPersistenceFailed: boolean;

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

  /**
   * Property page
   * @readonly
   *
   * @description
   * Current requested journal page.
   *
   * @access public
   *
   * @type {number}
   */
  readonly page: number;

  /**
   * Property itemsPerPage
   * @readonly
   *
   * @description
   * Bounded server journal page size.
   *
   * @access public
   *
   * @type {number}
   */
  readonly itemsPerPage: number;

  /**
   * Property totalItems
   * @readonly
   *
   * @description
   * Exact authorized saved entry count; null when offline metadata is unknown.
   *
   * @access public
   *
   * @type {number | null}
   */
  readonly totalItems: number | null;

  /**
   * Property nextPage
   * @readonly
   *
   * @description
   * Known next journal page.
   *
   * @access public
   *
   * @type {number | null}
   */
  readonly nextPage: number | null;

  /**
   * Property readVersion
   * @readonly
   *
   * @description
   * Monotonic read generation fencing obsolete history responses.
   *
   * @access public
   *
   * @type {number}
   */
  readonly readVersion: number;

  /**
   * Property historyCallStates
   * @readonly
   *
   * @description
   * Independent explicit revision-page request states, including retained pages on retry.
   *
   * @access public
   *
   * @type {Readonly<Partial<Record<string, CallState<InterventionTimeEntryVersionsOutput>>>>}
   */
  readonly historyCallStates: Readonly<
    Partial<Record<string, CallState<InterventionTimeEntryVersionsOutput>>>
  >;

  /**
   * Property draftEntryCallState
   * @readonly
   *
   * @description
   * Independent bounded read of a saved correction target outside the displayed journal page.
   *
   * @access public
   *
   * @type {CallState<InterventionTimeEntryView>}
   */
  readonly draftEntryCallState: CallState<InterventionTimeEntryView>;
}
