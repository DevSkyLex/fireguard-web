/**
 * Type SubscriptionStatusTagSeverity
 *
 * @description
 * Severity vocabulary for the subscription status indicator. Page-local
 * because it renders in exactly one place — the current-plan summary — and no
 * shared `TagSeverity` exists: the render site maps it to an icon colour and
 * always pairs it with a label, so status never depends on colour alone.
 *
 * @since 1.0.0
 */
export type SubscriptionStatusTagSeverity = 'neutral' | 'info' | 'success' | 'warning' | 'danger';
