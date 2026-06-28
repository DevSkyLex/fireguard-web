import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { StoreFailureEventPayload } from '@core/request-state';

/**
 * Constant interventionBoardStoreEvents
 * @const interventionBoardStoreEvents
 *
 * @description
 * Component-scoped pipeline-board store events dispatched when the board load
 * or an optimistic status move fails, so the page can surface a toast.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const interventionBoardStoreEvents = eventGroup({
  source: 'Intervention Board Store',
  events: {
    loadFailed: type<StoreFailureEventPayload>(),
    moveFailed: type<StoreFailureEventPayload>(),
  },
});
