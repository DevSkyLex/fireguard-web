import type { InvoiceStatusTagDescriptor } from './invoice-status-tag-descriptor.interface';

/**
 * Descriptors for `InvoiceOutput.status`, the raw Stripe invoice status.
 * `paid` is the one healthy state and carries success; `open` is still
 * awaiting payment and carries warning; `uncollectible` is a payment failure
 * the organization cannot recover from itself and carries danger; `void` and
 * `draft` are neutral, non-actionable states.
 */
const STATUS: Readonly<Record<string, InvoiceStatusTagDescriptor>> = {
  paid: {
    label: $localize`:@@org.settings.invoiceStatus.paid:Paid`,
    severity: 'success',
    icon: 'lucideCircleCheck',
  },
  open: {
    label: $localize`:@@org.settings.invoiceStatus.open:Awaiting payment`,
    severity: 'warning',
    icon: 'lucideClock',
  },
  uncollectible: {
    label: $localize`:@@org.settings.invoiceStatus.uncollectible:Uncollectible`,
    severity: 'danger',
    icon: 'lucideCircleAlert',
  },
  void: {
    label: $localize`:@@org.settings.invoiceStatus.void:Void`,
    severity: 'neutral',
    icon: 'lucideBan',
  },
  draft: {
    label: $localize`:@@org.settings.invoiceStatus.draft:Draft`,
    severity: 'neutral',
    icon: 'lucidePencil',
  },
};

/**
 * Function resolveInvoiceStatusTag
 * @function resolveInvoiceStatusTag
 *
 * @description
 * Resolves the presentation descriptor for a raw invoice status value. Falls
 * back to a neutral, humanised descriptor for an unknown value so an invoice
 * row degrades to a readable label instead of rendering the raw enum.
 *
 * @since 1.7.0
 *
 * @param {string} value - Raw Stripe invoice status value.
 *
 * @returns {InvoiceStatusTagDescriptor} The matching descriptor, or a humanised fallback.
 */
export function resolveInvoiceStatusTag(value: string): InvoiceStatusTagDescriptor {
  return (
    STATUS[value] ?? {
      label: value.replaceAll('_', ' '),
      severity: 'neutral',
      icon: 'lucideTag',
    }
  );
}
