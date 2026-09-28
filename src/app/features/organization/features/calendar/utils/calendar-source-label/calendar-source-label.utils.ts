import type { CalendarSourceKey } from '@features/organization/features/calendar/models';

/**
 * Function calendarSourceLabelOf
 *
 * @description
 * The short localized name of a feed source, shared by `CalendarEntryList`'s
 * row badge and the page's "Partial results" banner — the single place this
 * mapping is written, replacing the two independent copies (a component
 * method and a template `@switch`) that had drifted apart.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {CalendarSourceKey} sourceKey - The feed source to name.
 *
 * @returns {string} A short localized source name.
 */
export function calendarSourceLabelOf(sourceKey: CalendarSourceKey): string {
  switch (sourceKey) {
    case 'calendar_event':
      return $localize`:@@calendar.source.event:Event`;
    case 'inspection':
      return $localize`:@@calendar.source.inspection:Inspection`;
    case 'intervention':
      return $localize`:@@calendar.source.intervention:Intervention`;
    case 'maintenance':
      return $localize`:@@calendar.source.maintenance:Maintenance`;
  }
}
