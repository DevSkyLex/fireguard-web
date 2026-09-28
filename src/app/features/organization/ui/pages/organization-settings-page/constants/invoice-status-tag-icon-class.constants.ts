import type { InvoiceStatusTagSeverity } from '../models';

/**
 * Constant INVOICE_STATUS_TAG_ICON_CLASS
 *
 * @description
 * The colour each severity puts on the invoice status icon, and on nothing
 * else, per `DESIGN.md`'s glyph rule — the same severity-to-token mapping the
 * subscription status tag uses.
 *
 * @since 1.7.0
 *
 * @type {Readonly<Record<InvoiceStatusTagSeverity, string>>}
 */
export const INVOICE_STATUS_TAG_ICON_CLASS: Readonly<Record<InvoiceStatusTagSeverity, string>> = {
  neutral: 'text-muted-foreground',
  info: 'text-info',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-destructive',
};
