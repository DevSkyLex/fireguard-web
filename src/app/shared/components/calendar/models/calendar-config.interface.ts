import type { CalendarView } from './calendar-view.type';

/**
 * Interface CalendarConfig
 *
 * @description
 * Optional presentation configuration for the {@link Calendar}. Every field has
 * a sensible default, so a consumer can pass nothing and still get a complete
 * month/week/agenda calendar.
 *
 * @since 1.0.0
 */
export interface CalendarConfig {
  /** Views to offer in the toolbar switch. Defaults to all three. */
  readonly views?: readonly CalendarView[];

  /** First column of the week: 0 = Sunday, 1 = Monday. Defaults to 1. */
  readonly weekStartsOn?: 0 | 1;

  /** Maximum event chips shown in a month cell before "+N more". Defaults to 3. */
  readonly maxEventsPerDay?: number;

  /** First hour rendered in the week time-grid (0–23). Defaults to 7. */
  readonly dayStartHour?: number;

  /** Last hour rendered in the week time-grid (1–24). Defaults to 20. */
  readonly dayEndHour?: number;

  /** Whether the configuration sidebar is shown. Defaults to true. */
  readonly showSidebar?: boolean;
}
