/**
 * Type OrganizationStatusTagSeverity
 *
 * @description
 * Severity vocabulary for the organization status indicator. Page-local
 * because it renders in exactly one place — the Danger zone's Suspend/restore
 * row — and no shared `TagSeverity` exists: the render site maps it to an
 * icon colour and always pairs it with a label, so status never depends on
 * colour alone.
 *
 * @since 1.9.0
 */
export type OrganizationStatusTagSeverity = 'neutral' | 'info' | 'success' | 'warning' | 'danger';
