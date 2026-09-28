import type { CalendarSourceKey } from '@features/organization/features/calendar/models';
import type { CalendarDisplayEvent } from '@shared/calendar';

/**
 * Constant SOURCE_TONE
 * @const SOURCE_TONE
 *
 * @description
 * The badge tone each feed source renders with, shared by the grid chips
 * (`CalendarPage.events`) and the day/agenda rows (`CalendarEntryList`) —
 * neutral for every source, since `destructive`/`default` carry a semantic
 * weight (alarm, primary) no source inherently has; a maintenance schedule
 * that is up to date must not read as an alarm, and an ordinary standalone
 * event earns no more visual priority than the record types it shares the
 * feed with. What now distinguishes a source is its leading glyph
 * ({@link SOURCE_ICON}), not its tone.
 *
 * @since 1.2.0
 */
export const SOURCE_TONE: Readonly<Record<CalendarSourceKey, CalendarDisplayEvent['tone']>> = {
  calendar_event: 'outline',
  intervention: 'secondary',
  inspection: 'outline',
  maintenance: 'secondary',
};
