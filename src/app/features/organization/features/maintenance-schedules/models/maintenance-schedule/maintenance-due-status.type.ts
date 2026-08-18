/**
 * Type MaintenanceDueStatus
 *
 * @description
 * How close a schedule's next maintenance is, exactly as the backend
 * Maintenance module computes it on an hourly sweep. **Authoritative** —
 * never re-derive urgency from `nextDueAt` client-side; the sweep means this
 * value can lag the raw date by up to an hour, and that lag is intentional.
 *
 * `unscheduled` is the absence of a schedule for the equipment type, not a
 * fifth compliance state. `overdue` with no `nextDueAt`
 * ({@link MaintenanceScheduleOutput.nextDueAt}) is a real, distinct state —
 * "tracked but never inspected" — not a data error.
 *
 * @since 1.0.0
 */
export type MaintenanceDueStatus = 'unscheduled' | 'up_to_date' | 'due_soon' | 'overdue';
