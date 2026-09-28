import type { CalendarSourceKey } from '@features/organization/features/calendar/models';

/**
 * Constant SOURCE_ICON
 * @const SOURCE_ICON
 *
 * @description
 * The `ng-icon` name each feed source renders `aria-hidden` next to its
 * label — the row badge (`CalendarEntryList`) and the month-grid chip
 * (`CalendarPage.events`) both consume this, so a source stays identifiable
 * once its badge tone is neutralized (`DESIGN.md`).
 *
 * @since 1.0.0
 */
export const SOURCE_ICON: Readonly<Record<CalendarSourceKey, string>> = {
  calendar_event: 'lucideCalendar',
  intervention: 'lucideCalendarClock',
  inspection: 'lucideClipboardCheck',
  maintenance: 'lucideWrench',
};
