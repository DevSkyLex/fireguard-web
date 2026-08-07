/**
 * Type InterventionTagSeverity
 *
 * @description
 * Severity vocabulary shared by every intervention status indicator.
 *
 * Feature-local by necessity: this used to alias the app-wide `TagSeverity`
 * from `@shared/tag-severity`, which no longer exists. It stays here until a
 * second feature needs the same five levels (`ARCHITECTURE.md` §2.9) — the
 * severity is a presentation weight, never a colour: the render site maps it
 * to a spartan badge variant and a tint, and always pairs it with an icon and
 * a label so status never depends on colour alone.
 *
 * @since 2.0.0
 */
export type InterventionTagSeverity = 'neutral' | 'info' | 'success' | 'warning' | 'danger';
