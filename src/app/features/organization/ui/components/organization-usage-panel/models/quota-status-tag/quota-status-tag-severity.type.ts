/**
 * Type QuotaStatusTagSeverity
 *
 * @description
 * Severity vocabulary for a quota meter row. Component-local because it
 * renders in exactly one place and no shared `TagSeverity` exists: the render
 * site maps it to an icon colour and always pairs it with a label, so a
 * near-limit or full row never depends on colour alone.
 *
 * @since 1.0.0
 */
export type QuotaStatusTagSeverity = 'neutral' | 'warning' | 'danger';
