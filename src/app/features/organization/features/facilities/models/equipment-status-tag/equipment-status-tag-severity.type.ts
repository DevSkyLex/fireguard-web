/**
 * Type EquipmentStatusTagSeverity
 *
 * @description
 * Severity vocabulary for the equipment status indicator this feature reads
 * read-only on a plan-overlay pin. Feature-local by necessity (no shared
 * `TagSeverity` exists) — a presentation weight, never a colour: the render
 * site always pairs it with an icon and a label so status never depends on
 * colour alone.
 *
 * @since 1.0.0
 */
export type EquipmentStatusTagSeverity = 'neutral' | 'success' | 'warning' | 'danger';
