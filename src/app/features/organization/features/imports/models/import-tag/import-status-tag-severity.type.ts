/**
 * Type ImportStatusTagSeverity
 * @type ImportStatusTagSeverity
 *
 * @description
 * Presentation weight for an `ImportJobStatus` descriptor, never a colour:
 * the render site maps it to a badge tint and always pairs it with an icon
 * and a label, so status never depends on colour alone (WCAG 1.4.1).
 * Feature-local, matching `approvals`' own `ApprovalTagSeverity` rather than
 * a shared type (`ARCHITECTURE.md` §2.9 — wait for a third consumer).
 *
 * @since 1.0.0
 */
export type ImportStatusTagSeverity = 'neutral' | 'info' | 'success' | 'warning' | 'danger';
