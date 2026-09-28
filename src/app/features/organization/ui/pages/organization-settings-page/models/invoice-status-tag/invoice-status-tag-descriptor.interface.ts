import type { InvoiceStatusTagSeverity } from './invoice-status-tag-severity.type';

/**
 * Interface InvoiceStatusTagDescriptor
 *
 * @description
 * How one Stripe invoice status reads on an invoice row: `label` and `icon`
 * always render, so the state is legible without colour; `severity` only
 * tints the icon (WCAG 1.4.1).
 *
 * @since 1.7.0
 */
export interface InvoiceStatusTagDescriptor {
  /** Localized human label. */
  readonly label: string;

  /** Presentation weight the render site maps to an icon tint. */
  readonly severity: InvoiceStatusTagSeverity;

  /** Registered `@ng-icons/lucide` name. */
  readonly icon: string;
}
