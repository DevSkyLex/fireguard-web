/**
 * Type AutomationStatusTagSeverity
 *
 * @description
 * Presentation weight for an automation attempt's status descriptor, never a
 * colour: the render site maps it to a spartan badge glyph tint and always
 * pairs it with an icon and a label, so status never depends on colour alone
 * (WCAG 1.4.1).
 *
 * Feature-local, matching how `approvals`' own `ApprovalTagSeverity` and
 * `imports`' `ImportStatusTagSeverity` each keep their own copy rather than
 * share one (`ARCHITECTURE.md` §2.9 — wait for a third consumer).
 *
 * @since 1.0.0
 */
export type AutomationStatusTagSeverity = 'neutral' | 'success' | 'warning' | 'danger';
