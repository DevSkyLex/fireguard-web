import type { TagSeverity } from '../../tag';

/**
 * Interface CalendarEvent
 *
 * @description
 * A single occurrence plotted on the calendar. Domain-agnostic: it carries only
 * what the calendar needs to place and colour it. The `tone` reuses the shared
 * severity vocabulary so the bar/dot colour matches the rest of the app, and
 * `categoryIds` link the event to the sidebar's filter categories. The opaque
 * `data` lets a consumer round-trip its own model through event clicks without
 * the calendar knowing the shape.
 *
 * @since 1.0.0
 */
export interface CalendarEvent {
  /** Stable unique identifier. */
  readonly id: string;

  /** Start instant; the day it falls on anchors the event in month/agenda views. */
  readonly start: Date;

  /** Optional end instant; defaults to a short block in the week view when absent. */
  readonly end?: Date | null;

  /** Human-readable title rendered by the default chip. */
  readonly title: string;

  /** Semantic colour role for the event bar/dot. */
  readonly tone?: TagSeverity;

  /** Whether the event spans the whole day (rendered in the week all-day row). */
  readonly allDay?: boolean;

  /** Categories this event belongs to, matched against the sidebar filters. */
  readonly categoryIds?: readonly string[];

  /** Opaque consumer payload echoed back on interaction. */
  readonly data?: unknown;
}
