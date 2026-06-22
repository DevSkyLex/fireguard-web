import type { TagSeverity } from '../../tag';

/**
 * Interface CalendarCategory
 *
 * @description
 * One toggleable filter entry in the sidebar (the generic equivalent of a
 * "calendar" or "category"): a labelled, colour-dotted switch. When inactive,
 * events carrying its id are hidden.
 *
 * @since 1.0.0
 */
export interface CalendarCategory {
  /** Stable identifier matched against {@link CalendarEvent.categoryIds}. */
  readonly id: string;

  /** Human-readable label shown next to the colour dot. */
  readonly label: string;

  /** Semantic colour role for the dot. */
  readonly tone?: TagSeverity;

  /** Whether events in this category are currently shown. */
  readonly active: boolean;
}

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
