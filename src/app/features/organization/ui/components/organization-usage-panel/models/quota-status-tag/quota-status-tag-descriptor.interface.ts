import type { QuotaStatusTagSeverity } from './quota-status-tag-severity.type';

/**
 * Interface QuotaStatusTagDescriptor
 *
 * @description
 * How one `QuotaStatus` value reads on a meter row: `label` and `icon` always
 * render, so a near-limit or full resource is legible without colour;
 * `severity` only tints the icon (WCAG 1.4.1).
 *
 * @since 1.0.0
 */
export interface QuotaStatusTagDescriptor {
  /** Localized human label. */
  readonly label: string;

  /** Presentation weight the render site maps to an icon tint. */
  readonly severity: QuotaStatusTagSeverity;

  /** Registered `@ng-icons/lucide` name. */
  readonly icon: string;
}
