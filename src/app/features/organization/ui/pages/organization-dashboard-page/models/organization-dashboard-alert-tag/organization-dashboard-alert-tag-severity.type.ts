/**
 * Type OrganizationDashboardAlertTagSeverity
 *
 * @description
 * Severity vocabulary for one dashboard alert row. Page-local by necessity
 * (no shared `TagSeverity` exists) — a presentation weight, never a colour:
 * the render site maps it to an icon tint and always pairs it with an icon
 * and a label so an alert never depends on colour alone.
 *
 * @since 1.0.0
 */
export type OrganizationDashboardAlertTagSeverity =
  | 'neutral'
  | 'info'
  | 'success'
  | 'warning'
  | 'danger';
