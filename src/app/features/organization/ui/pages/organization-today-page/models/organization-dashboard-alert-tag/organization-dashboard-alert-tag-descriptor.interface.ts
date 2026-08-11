import type { OrganizationDashboardAlertTagSeverity } from './organization-dashboard-alert-tag-severity.type';

/**
 * Interface OrganizationDashboardAlertTagDescriptor
 * @interface OrganizationDashboardAlertTagDescriptor
 *
 * @description
 * How one dashboard alert code looks, wherever it appears. `label` and
 * `icon` always render, so an alert is legible without its colour;
 * `severity` only tints what the other two already say (WCAG 1.4.1).
 *
 * @since 1.0.0
 */
export interface OrganizationDashboardAlertTagDescriptor {
  /** Localized human label naming what the alert reports. */
  readonly label: string;

  /** Presentation weight the render site maps to an icon tint. */
  readonly severity: OrganizationDashboardAlertTagSeverity;

  /** Registered `@ng-icons/lucide` name, e.g. `lucideOctagonAlert`. */
  readonly icon: string;
}
