/**
 * Type ApprovalTagSeverity
 *
 * @description
 * Presentation weight for a status descriptor, never a colour: the render
 * site maps it to a spartan badge tint and always pairs it with an icon and
 * a label, so status never depends on colour alone (WCAG 1.4.1).
 *
 * Feature-local, matching how `interventions`' own `InterventionTagSeverity`
 * and `maintenance-schedules`' `MaintenanceTagSeverity` each keep their own
 * copy rather than share one (`ARCHITECTURE.md` §2.9 — wait for a third
 * consumer).
 *
 * @since 1.0.0
 */
export type ApprovalTagSeverity = 'neutral' | 'info' | 'success' | 'warning' | 'danger';
