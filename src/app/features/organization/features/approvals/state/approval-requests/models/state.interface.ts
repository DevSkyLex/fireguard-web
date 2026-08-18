import type { CallState } from '@core/request-state';
import type { ApprovalActionTypeOutput } from '@features/organization/features/approvals/models';

/**
 * Interface ApprovalRequestsState
 * @interface ApprovalRequestsState
 *
 * @description
 * Auxiliary state for {@link ApprovalRequestsStore}. Entity state
 * (`requestEntities`, `requestEntityMap`, `requestIds`) is initialised by
 * `withEntities` and lives outside this interface.
 *
 * @since 1.0.0
 */
export interface ApprovalRequestsState {
  /** @type {CallState<null>} */
  readonly listCallState: CallState<null>;
  /** @type {number} */
  readonly totalRequests: number;
  /**
   * Shared by approve and reject — the inbox opens one decision dialog at a
   * time, so one field covers both, matching
   * `MaintenanceSchedulesStore.overrideCallState`. Carries no payload: a
   * successful decision replaces the row directly via `setEntity`.
   *
   * @type {CallState}
   */
  readonly decideCallState: CallState;
  /** @type {CallState<ReadonlyArray<ApprovalActionTypeOutput>>} */
  readonly actionTypesCallState: CallState<ReadonlyArray<ApprovalActionTypeOutput>>;
}
