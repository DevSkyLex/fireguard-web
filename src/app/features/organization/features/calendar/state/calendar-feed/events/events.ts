import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { StoreFailureEventPayload } from '@core/request-state';

/**
 * Constant calendarFeedStoreEvents
 * @const calendarFeedStoreEvents
 *
 * @description
 * Failure outcomes of the calendar feed store's drag-reschedule write,
 * dispatched purely so the app-wide feedback listener can raise a toast.
 * There is no success event: the optimistically repositioned chip settling
 * on its new day says it better than a toast would, and the page's own
 * `aria-live` region already announces the move to assistive tech.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const calendarFeedStoreEvents = eventGroup({
  source: 'Calendar Feed Store',
  events: {
    /**
     * Event moveEventFailed
     *
     * @description
     * Dispatched when the drag-reschedule merge-patch fails, after the
     * optimistically moved entry has been rolled back to its original day.
     */
    moveEventFailed: type<StoreFailureEventPayload>(),
  },
});
