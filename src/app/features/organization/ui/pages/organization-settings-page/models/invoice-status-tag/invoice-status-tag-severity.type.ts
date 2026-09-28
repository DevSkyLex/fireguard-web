/**
 * Type InvoiceStatusTagSeverity
 *
 * @description
 * Severity vocabulary for the invoice status indicator. Page-local because it
 * renders in exactly one place — the Subscription tab's invoice list — and no
 * shared `TagSeverity` exists: the render site maps it to an icon colour and
 * always pairs it with a label, so status never depends on colour alone.
 *
 * @since 1.7.0
 */
export type InvoiceStatusTagSeverity = 'neutral' | 'info' | 'success' | 'warning' | 'danger';
