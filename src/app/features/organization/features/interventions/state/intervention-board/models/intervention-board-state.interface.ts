import type { CallState } from '@core/request-state';
import type {
  InterventionBoardColumnId,
  InterventionStatus,
} from '@features/organization/features/interventions/models';

/**
 * Interface InterventionBoardState
 *
 * @description
 * Component-scoped state for the pipeline board. Intervention cards are managed
 * by the `withEntities` feature; this interface tracks the per-status server
 * totals (lane count badges), the highest page loaded per status (driving the
 * incremental "load more"), and the request state for the lightweight counts
 * fetch, the board card load, the per-lane load-more, and the optimistic move.
 *
 * @since 1.1.0
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
   * Property statusPages
   * @readonly
   *
   * @description
   * Highest 1-based page fetched per workflow status (0 before any card load).
   * The next incremental page for a status is `statusPages[status] + 1`, and a
   * status still has cards to reveal while `statusPages[status] * pageSize` is
   * below its server total.
   *
   * @type {Readonly<Record<InterventionStatus, number>>}
   */
  readonly statusPages: Readonly<Record<InterventionStatus, number>>;

  /**
   * Property countsCallState
   * @readonly
   *
   * @description
   * Loading / success / error state for the lightweight per-status counts fetch
   * that populates {@link statusTotals} for the metric strip on every view,
   * independently of the heavier board card load.
   *
   * @type {CallState}
   */
  readonly countsCallState: CallState;

  /**
   * Property loadCallState
   * @readonly
   *
   * @description
   * Loading / success / error state for the board card load (board view only).
   *
   * @type {CallState}
   */
  readonly loadCallState: CallState;

  /**
   * Property loadMoreCallStates
   * @readonly
   *
   * @description
   * Per-lane loading / success / error state for the incremental "load more"
   * fetch, keyed by lane identifier so each lane footer tracks its own request.
   *
   * @type {Readonly<Record<InterventionBoardColumnId, CallState>>}
   */
  readonly loadMoreCallStates: Readonly<Record<InterventionBoardColumnId, CallState>>;

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
