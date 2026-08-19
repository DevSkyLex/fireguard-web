import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { StoreFailureEventPayload } from '@core/request-state';

/**
 * Constant approvalRequestsStoreEvents
 * @const approvalRequestsStoreEvents
 *
 * @description
 * Events dispatched by {@link ApprovalRequestsStore}. `decideFailed` is
 * deliberately absent: every decision failure is rendered inline in the
 * decision dialog from `decideCallState.error`, never as a generic toast —
 * the 409/403 outcomes are workflow answers a reader must read and act on
 * (refresh, retry, or give up), not a transient fault a toast could convey.
 *
 * @since 1.0.0
 */
export const approvalRequestsStoreEvents = eventGroup({
  source: 'Approval Requests Store',
  events: {
    listFailed: type<StoreFailureEventPayload>(),
  },
});
