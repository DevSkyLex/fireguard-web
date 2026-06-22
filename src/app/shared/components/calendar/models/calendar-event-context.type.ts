import type { CalendarEvent } from './calendar-event.interface';

/**
 * Type CalendarEventContext
 *
 * @description
 * Template context handed to the event and event-detail templates. The calendar
 * exposes the current {@link CalendarEvent} as the implicit value, so a consumer
 * binds it with `let-event` in the projected `<ng-template>` and renders the
 * event however it likes without the calendar knowing the markup.
 *
 * @since 1.0.0
 */
export type CalendarEventContext = {
  /** Current event, bound through `let-event` in the consumer template. */
  readonly $implicit: CalendarEvent;
};
