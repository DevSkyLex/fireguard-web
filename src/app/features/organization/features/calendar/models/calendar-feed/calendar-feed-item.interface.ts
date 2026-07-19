/**
 * Where a calendar entry comes from.
 *
 * The mockup shows a fourth category, "Audit". It has no business existence in
 * the backend (`Calendar/MODULE.md` says so explicitly), so it is deliberately
 * absent here rather than stubbed.
 *
 * @since 1.0.0
 */
export type CalendarFeedSourceKey =
  | 'calendar_event'
  | 'inspection'
  | 'intervention'
  | 'maintenance';

/**
 * One entry of the unified calendar feed.
 *
 * `status` is the source's raw enum value, never a translated label — resolving
 * it is the reader's job, through that source's own tag registry.
 *
 * @since 1.0.0
 */
export interface CalendarFeedItem {
  readonly sourceKey: CalendarFeedSourceKey;
  readonly id: string;
  readonly title: string;
  readonly description: string | null;
  readonly startsAt: string;
  readonly endsAt: string | null;
  readonly allDay: boolean;
  readonly facilityId: string | null;
  readonly status: string | null;
  readonly targetType: string;
  readonly targetId: string;
}
