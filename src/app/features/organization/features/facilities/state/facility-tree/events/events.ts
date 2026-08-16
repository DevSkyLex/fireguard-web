import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { FeedbackEventPayload, StoreFailureEventPayload } from '@core/request-state';

/**
 * Constant facilityTreeStoreEvents
 * @const facilityTreeStoreEvents
 *
 * @description
 * Asset explorer tree store events. Both carry a `FeedbackEventPayload`,
 * picked up by the app-wide feedback listener and rendered as a toast — the
 * failure toast is how a rolled-back drag-drop move surfaces to the
 * operator, since the gesture itself has no confirm step.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const facilityTreeStoreEvents = eventGroup({
  source: 'Facility Tree Store',
  events: {
    /** Dispatched when moving a facility fails; the optimistic re-parent has already been rolled back. */
    moveFailed: type<StoreFailureEventPayload>(),
    /** Dispatched when a facility is moved. */
    moveSucceeded: type<FeedbackEventPayload>(),
  },
});
