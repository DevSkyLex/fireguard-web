import type { InterventionListOptions } from '../intervention/intervention-list-options.interface';

/**
 * Type InterventionCalendarFilters
 *
 * @description
 * The subset of the collection query the calendar accepts.
 *
 * Deliberately date-free: the calendar's visible window already is its date
 * filter, and a second date bound would fight it. Everything else narrows the
 * calendar exactly as it narrows the list and the board, so switching render
 * never silently widens the result.
 *
 * @since 1.0.0
 */
export type InterventionCalendarFilters = Pick<
  InterventionListOptions,
  'status' | 'type' | 'site' | 'responsible'
>;
