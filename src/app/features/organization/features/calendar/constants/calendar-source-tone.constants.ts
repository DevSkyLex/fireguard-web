import type { CalendarSourceKey } from '@features/organization/features/calendar/models';
import type { CalendarDisplayEvent } from '@shared/calendar';

/**
 * Constant SOURCE_TONE
 * @const SOURCE_TONE
 *
 * @description
 * The badge tone each feed source renders with, shared by the grid chips
 * (`CalendarPage.events`) and the day/agenda rows (`CalendarEntryList`) —
 * one glance says what kind of commitment a day carries (`FEATURE.md`).
 *
 * @since 1.1.0
 */
export const SOURCE_TONE: Readonly<Record<CalendarSourceKey, CalendarDisplayEvent['tone']>> = {
  calendar_event: 'default',
  intervention: 'secondary',
  inspection: 'outline',
  maintenance: 'destructive',
};
