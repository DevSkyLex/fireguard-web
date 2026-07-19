import type {
  CalendarFeedItem,
  CalendarFeedSourceKey,
} from '@features/organization/features/calendar/models';
import type { CalendarEvent } from '@shared/components';

/**
 * How each feed source reads on the grid.
 *
 * Tone is per source, not per status: the calendar answers "what kind of work
 * is this day made of", and a per-status palette would turn a month view into
 * noise. Status stays available on the entry for the detail surfaces.
 */
const SOURCE_TONE: Readonly<Record<CalendarFeedSourceKey, CalendarEvent['tone']>> = {
  intervention: 'info',
  inspection: 'success',
  maintenance: 'warn',
  calendar_event: 'secondary',
};

/**
 * Function adaptCalendarFeed
 *
 * @description
 * Maps the merged backend feed onto the shared calendar's event shape.
 *
 * An entry with no end is left open rather than given an arbitrary duration —
 * the grid renders it as a point in time, which is what the data says.
 *
 * @param {readonly CalendarFeedItem[]} items - The feed entries.
 *
 * @returns {readonly CalendarEvent[]} Events for the shared calendar.
 */
export function adaptCalendarFeed(items: readonly CalendarFeedItem[]): readonly CalendarEvent[] {
  return items.map(
    (item: CalendarFeedItem): CalendarEvent => ({
      id: `${item.sourceKey}:${item.id}`,
      title: item.title,
      start: new Date(item.startsAt),
      end: item.endsAt === null ? null : new Date(item.endsAt),
      allDay: item.allDay,
      tone: SOURCE_TONE[item.sourceKey],
      categoryIds: [item.sourceKey],
      data: item,
    }),
  );
}
