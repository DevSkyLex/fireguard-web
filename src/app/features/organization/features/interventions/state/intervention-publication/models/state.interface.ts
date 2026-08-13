import type { CallState } from '@core/request-state';
import type { PublicationOutput } from '@features/organization/features/interventions/models';

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
  //#endregion
}
