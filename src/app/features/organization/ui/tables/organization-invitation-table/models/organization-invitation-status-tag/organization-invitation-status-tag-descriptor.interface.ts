import type { OrganizationInvitationStatusTagSeverity } from './organization-invitation-status-tag-severity.type';

/**
 * Interface OrganizationInvitationStatusTagDescriptor
 *
 * @description
 * How one `OrganizationInvitationStatus` value looks, wherever it appears.
 * `label` and `icon` always render, so a value is legible without its
 * colour; `severity` only tints what the other two already say (WCAG 1.4.1).
 *
 * @since 1.0.0
 */
export interface OrganizationInvitationStatusTagDescriptor {
  /** Localized human label. */
  readonly label: string;

  /** Presentation weight the render site maps to a tint. */
  readonly severity: OrganizationInvitationStatusTagSeverity;

  /** Registered `@ng-icons/lucide` name, e.g. `lucideCircleCheck`. */
  readonly icon: string;
}
