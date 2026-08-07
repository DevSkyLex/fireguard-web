import type { CallState } from '@core/request-state';
import type { InterventionOutput } from '@features/organization/features/interventions/models';

/**
 * Interface InterventionState
 * @interface InterventionState
 *
 * @description
 * Component-scoped state for intervention list and creation workflows. Intervention
 * entities are managed by the `withEntities` feature; this interface tracks
 * auxiliary request state and server totals.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface InterventionState {
  //#region Properties
  /**
   * Property totalInterventions
   * @readonly
   *
   * @description
   * Server-reported number of interventions for the active organization.
   *
   * @since 1.0.0
   *
   * @type {number}
   */
  readonly totalInterventions: number;

  /**
   * Property listCallState
   * @readonly
   *
   * @description
   * Loading / success / error state for intervention listing.
   *
   * @since 1.0.0
   *
   * @type {CallState}
   */
  readonly listCallState: CallState;

  /**
   * Property createCallState
   * @readonly
   *
   * @description
   * Loading / success / error state for intervention creation.
   * Carries the created intervention on success so route pages can navigate.
   *
   * @since 1.0.0
   *
   * @type {CallState<InterventionOutput>}
   */
  readonly createCallState: CallState<InterventionOutput>;

  /**
   * Property transitionCallState
   * @readonly
   *
   * @description
   * Loading / success / error state for a single-status-transition PATCH,
   * kept separate from {@link listCallState} so a transition in flight never
   * clobbers the list's own loading state.
   *
   * @since 1.2.0
   *
   * @type {CallState<InterventionOutput>}
   */
  readonly transitionCallState: CallState<InterventionOutput>;

  /**
   * Property isListCapped
   * @readonly
   *
   * @description
   * True when the last successful `load` found more than the 500-item cap
   * fetched across up to five 100-item pages, so the page can surface a
   * "refine your search" notice instead of silently truncating the list.
   *
   * @since 1.3.0
   *
   * @type {boolean}
   */
  readonly isListCapped: boolean;

  /**
   * Property deleteCallState
   * @readonly
   *
   * @description
   * Loading / success / error state for intervention deletion. Shared across
   * concurrent deletes (single row or bulk selection), each keyed by its own
   * `mergeMap`'d request; a page reads it only to know whether *a* delete is
   * in flight, per-row outcome is carried by the dispatched success/failure
   * events instead.
   *
   * @since 4.1.0
   *
   * @type {CallState}
   */
  readonly deleteCallState: CallState;
  //#endregion
}
