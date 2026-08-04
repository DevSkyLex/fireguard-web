import type { CallState } from '@core/request-state';
import type {
  InterventionQueue,
  InterventionUnsyncedEntry,
} from '@features/organization/features/interventions/models';

/**
 * Interface OrganizationTodayQueues
 * @interface OrganizationTodayQueues
 *
 * @description
 * The collection-backed questions the landing page asks, resolved.
 * `upcoming` is not read beside the others: it answers "what comes next" once
 * nothing is waiting, so it only surfaces in the all-clear state.
 *
 * @version 1.1.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface OrganizationTodayQueues {
  //#region Properties
  /** Workable interventions past their due date. */
  readonly overdue: InterventionQueue;

  /** Interventions a reviewer sent back. */
  readonly changesRequested: InterventionQueue;

  /** Interventions submitted and waiting for a reviewer. */
  readonly awaitingReview: InterventionQueue;

  /** Planned interventions still ahead, nearest deadline first. */
  readonly upcoming: InterventionQueue;
  //#endregion
}

/**
 * Interface OrganizationTodayState
 * @interface OrganizationTodayState
 *
 * @description
 * State of the landing page's work queues.
 *
 * The two calls are deliberately separate. The collection queues need the
 * network; the unsynced queue is read from IndexedDB and must still render when
 * the operator is offline — precisely when it matters most. Folding them into
 * one call state would hide local work behind a failed request.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface OrganizationTodayState {
  //#region Properties
  /** The collection-backed queues. */
  readonly queuesCallState: CallState<OrganizationTodayQueues>;

  /** Interventions with operations still queued in the local outbox. */
  readonly unsyncedCallState: CallState<readonly InterventionUnsyncedEntry[]>;
  //#endregion
}
