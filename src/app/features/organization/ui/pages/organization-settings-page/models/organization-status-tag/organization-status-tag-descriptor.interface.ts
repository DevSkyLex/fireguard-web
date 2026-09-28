import type { OrganizationStatusTagSeverity } from './organization-status-tag-severity.type';

/**
 * Interface OrganizationStatusTagDescriptor
 *
 * @description
 * How one `OrganizationOutput.status` value reads on the Danger zone's
 * Suspend/restore row: `label` and `icon` always render, so the state is
 * legible without colour; `severity` only tints the icon (WCAG 1.4.1).
 *
 * @since 1.9.0
 */
export interface OrganizationStatusTagDescriptor {
  /** Localized human label. */
  readonly label: string;

  /** Presentation weight the render site maps to an icon tint. */
  readonly severity: OrganizationStatusTagSeverity;

  /** Registered `@ng-icons/lucide` name. */
  readonly icon: string;
}
