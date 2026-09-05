import type { CallState } from '@core/request-state';
import type {
  PublicationOutput,
  PublicationTracking,
} from '@features/organization/features/interventions/models';

/**
 * Interface InterventionPublicationState
 * @interface InterventionPublicationState
 *
 * @description
 * Component-scoped state for one intervention's publication attempt: the
 * lifecycle of the request-and-poll round trip performed by
 * `InterventionPublicationService`.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface InterventionPublicationState {
  //#region Properties
  /**
   * Property publishCallState
   * @readonly
   *
   * @description
   * Lifecycle of the publish request and its bounded poll. `error` carries
   * both a rejected request (network failure, timed-out poll) and a
   * terminal `failed` publication result — either way nothing further
   * proceeds until the operator retries.
   *
   * @since 1.0.0
   *
   * @type {CallState<PublicationOutput>}
   */
  readonly publishCallState: CallState<PublicationOutput>;

  /**
   * Property publicationId
   * @readonly
   *
   * @description
   * The publication's id, captured from the last state the poll observed
   * before giving up — the same id the create call's 202 response carries,
   * since it never changes across polls. `null` until a poll actually times
   * out; {@link recheck} needs it to re-read the same publication.
   *
   * @since 1.1.0
   *
   * @type {string | null}
   */
  readonly publicationId: string | null;

  /**
   * Property longRunning
   * @readonly
   *
   * @description
   * Whether the current attempt has been pending for a while — flips true
   * roughly 30 seconds into a request that has not yet resolved, so the
   * confirmation can swap to a "this can take a couple of minutes" copy
   * instead of leaving the operator staring at an unchanging spinner.
   *
   * @since 1.1.0
   *
   * @type {boolean}
   */
  readonly longRunning: boolean;

  /**
   * Property timedOut
   * @readonly
   *
   * @description
   * Whether the last attempt ended because the bounded poll gave up while the
   * publication was still running server-side — distinct from a genuine
   * failure. The confirmation reads this to offer {@link recheck} instead of
   * a plain retry.
   *
   * @since 1.1.0
   *
   * @type {boolean}
   */
  readonly timedOut: boolean;
  /**
   * Property tracking
   * @readonly
   * @description Durable publication recovery state.
   * @since 1.0.0
   * @type {PublicationTracking | null}
   */
  readonly tracking: PublicationTracking | null;
  /**
   * Property storageError
   * @readonly
   * @description Recovery persistence failure, separate from publication status.
   * @since 1.0.0
   * @type {string | null}
   */
  readonly storageError: string | null;
  /**
   * Property restoreCallState
   * @readonly
   * @description Recovery lookup must finish before a new publication starts.
   * @since 1.0.0
   * @type {CallState}
   */
  readonly restoreCallState: CallState;
  //#endregion
}
