/**
 * Default first day of the week (1 = Monday), matching the app's regional
 * default.
 */
export const CALENDAR_DEFAULT_WEEK_STARTS_ON = 1;

/** Default month-cell chip cap before collapsing into "+N more". */
export const CALENDAR_DEFAULT_MAX_EVENTS_PER_DAY = 3;

/** Default first hour shown in the week time-grid. */
export const CALENDAR_DEFAULT_DAY_START_HOUR = 7;

/** Default last hour shown in the week time-grid. */
export const CALENDAR_DEFAULT_DAY_END_HOUR = 20;

/** Fixed month grid size: 6 weeks × 7 days. */
export const CALENDAR_MONTH_GRID_DAYS = 42;

/** Assumed duration (minutes) for a timed event with no explicit end. */
export const CALENDAR_DEFAULT_EVENT_MINUTES = 60;

/**
 * Short weekday labels, Sunday-first. {@link weekdayLabels} rotates these to the
 * configured week start.
 */
export const CALENDAR_WEEKDAY_SHORT: readonly string[] = [
  'Sun',
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat',
];
