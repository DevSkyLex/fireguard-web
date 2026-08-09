/**
 * Type CalendarSourceKey
 *
 * @description
 * The four sources the backend's unified calendar feed merges — and the only
 * four: standalone events (this feed's own data), inspections by
 * `performedAt`, interventions by `plannedStartAt`/`dueAt`, and preventive
 * maintenance by `nextDueAt`. Literals match the API byte for byte.
 *
 * @since 1.0.0
 */
export type CalendarSourceKey = 'calendar_event' | 'inspection' | 'intervention' | 'maintenance';
