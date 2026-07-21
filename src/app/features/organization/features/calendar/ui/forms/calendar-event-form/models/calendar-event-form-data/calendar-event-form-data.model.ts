import type { FormControl } from '@angular/forms';
import type { CalendarEventFormValues } from '../calendar-event-form-values';

/** Typed controls backing the calendar event form. */
export type CalendarEventFormData = {
  [K in keyof CalendarEventFormValues]: FormControl<CalendarEventFormValues[K]>;
};
