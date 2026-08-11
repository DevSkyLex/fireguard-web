import type { SubscriptionStatusTagSeverity } from './subscription-status-tag-severity.type';

/**
 * Interface SubscriptionStatusTagDescriptor
 *
 * @description
 * How one `SubscriptionStatus` value reads on the subscription summary:
 * `label` and `icon` always render, so the state is legible without colour;
 * `severity` only tints the icon (WCAG 1.4.1).
 *
 * @since 1.0.0
 */
export interface SubscriptionStatusTagDescriptor {
  /** Localized human label. */
  readonly label: string;

  /** Presentation weight the render site maps to an icon tint. */
  readonly severity: SubscriptionStatusTagSeverity;

  /** Registered `@ng-icons/lucide` name. */
  readonly icon: string;
}
