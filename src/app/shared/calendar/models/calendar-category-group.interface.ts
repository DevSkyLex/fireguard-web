import type { CalendarCategory } from './calendar-category.interface';

/**
 * Interface CalendarCategoryGroup
 *
 * @description
 * A titled section of related {@link CalendarCategory} switches in the sidebar
 * (e.g. a "Status" group). Filtering across groups is conjunctive: an event is
 * hidden as soon as any single category it belongs to is switched off.
 *
 * @since 1.0.0
 */
export interface CalendarCategoryGroup {
  /** Stable identifier for the group. */
  readonly id: string;

  /** Section heading. */
  readonly label: string;

  /** The toggleable categories in display order. */
  readonly categories: readonly CalendarCategory[];
}
