import type { CallState } from '@core/request-state';
import type { CalendarEventOutput } from '@features/organization/features/calendar/models';

/**
 * Interface CalendarEventsState
 * @interface CalendarEventsState
 *
 * @description
 * Component-level state for the calendar events mutation slice. Read-only
 * calendar entries stay on {@link CalendarFeedStore}; this slice only tracks
 * write operations against the standalone event resource.
 *
 * @since 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface CalendarEventsState {
  /** Tracks the create calendar event operation state. */
  readonly createCallState: CallState<CalendarEventOutput>;
}
