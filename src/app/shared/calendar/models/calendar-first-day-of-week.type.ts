/**
 * Type CalendarFirstDayOfWeek
 * @type CalendarFirstDayOfWeek
 *
 * @description
 * The day a rendered week starts on. Deliberately domain-free — the
 * organization feature maps its own regional preference onto this before
 * handing it over (ARCHITECTURE.md §2.7: the calendar is a shared concept
 * precisely because its inputs stay generic).
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export type CalendarFirstDayOfWeek = 'monday' | 'sunday';
