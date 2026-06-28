import type { CallState } from '@core/request-state';
import type { InterventionStatus } from '@features/organization/features/interventions/models';

/**
 * Interface InterventionBoardState
 *
 * @description
 * Component-scoped state for the pipeline board. Intervention cards are managed
 * by the `withEntities` feature; this interface tracks the per-status server
 * totals (lane count badges) and the request state for the board load and the
 * optimistic move.
 *
 * @since 1.0.0
 */
export interface InterventionBoardState {
  /**
   * Property statusTotals
   * @readonly
   *
   * @description
   * Server-reported number of interventions per workflow status, used for the
   * lane count badges (which may exceed the number of loaded cards).
   *
   * @type {Readonly<Record<InterventionStatus, number>>}
   */
  readonly statusTotals: Readonly<Record<InterventionStatus, number>>;

  /**
   * Property loadCallState
   * @readonly
   *
   * @description
   * Loading / success / error state for the board load.
   *
   * @type {CallState}
   */
  readonly loadCallState: CallState;

  /**
   * Property moveCallState
   * @readonly
   *
   * @description
   * Loading / success / error state for the optimistic status move.
   *
   * @type {CallState}
   */
  readonly moveCallState: CallState;
}
