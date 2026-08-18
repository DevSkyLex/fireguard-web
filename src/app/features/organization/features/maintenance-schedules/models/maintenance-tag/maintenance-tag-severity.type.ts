/**
 * Type MaintenanceTagSeverity
 *
 * @description
 * Presentation weight for a due-status descriptor, never a colour: the
 * render site maps it to a spartan badge tint and always pairs it with an
 * icon and a label, so status never depends on colour alone.
 *
 * Feature-local, not imported from `interventions`, matching how that
 * feature's own `InterventionTagSeverity` and `equipments`'
 * `EquipmentStatusTagKind` each keep their own copy rather than share one
 * (`ARCHITECTURE.md` §2.9 — wait for a third consumer).
 *
 * @since 1.0.0
 */
export type MaintenanceTagSeverity = 'neutral' | 'info' | 'success' | 'warning' | 'danger';
