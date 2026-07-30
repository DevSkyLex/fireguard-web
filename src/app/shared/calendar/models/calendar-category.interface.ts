import type { TagSeverity } from '@shared/tag-severity';

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
