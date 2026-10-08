/**
 * Constant ORDER_LABELS
 *
 * @description
 * Native order labels resolve backend lifecycle values without branching in a template.
 *
 * @since unreleased
 */
const ORDER_LABELS: Readonly<Record<string, string>> = {
  draft: $localize`:@@procurement.status.draft:Draft`,
  ordered: $localize`:@@procurement.status.ordered:Ordered`,
  partial_received: $localize`:@@procurement.status.partialReceived:Partially received`,
  received: $localize`:@@procurement.status.received:Received`,
  cancelled: $localize`:@@procurement.status.cancelled:Remaining quantities cancelled`,
};
/**
 * Constant RECEIPT_LABELS
 *
 * @description
 * Physical goods remain visible even while reserve equipment cannot yet be created.
 *
 * @since unreleased
 */
const RECEIPT_LABELS: Readonly<Record<string, string>> = {
  awaiting_individualization: $localize`:@@procurement.status.awaiting:Awaiting reserve equipment`,
  individualized: $localize`:@@procurement.status.individualized:Reserve equipment created`,
  stock_received: $localize`:@@procurement.status.stockReceived:Stock received`,
  returned: $localize`:@@procurement.status.returned:Returned`,
};

/**
 * Constant RETURN_LABELS
 *
 * @description
 * Distinguishes declared physical returns from their confirmed inventory reversal.
 *
 * @since unreleased
 */
const RETURN_LABELS: Readonly<Record<string, string>> = {
  awaiting_reconciliation: $localize`:@@procurement.status.awaitingReconciliation:Awaiting inventory reconciliation`,
  confirmed: $localize`:@@procurement.status.returnConfirmed:Inventory reversal confirmed`,
};

/**
 * Constant STATUS_LABELS
 *
 * @description
 * Each resource family retains its own server lifecycle labels.
 *
 * @since unreleased
 */
const STATUS_LABELS: Readonly<
  Record<'order' | 'receipt' | 'return', Readonly<Record<string, string>>>
> = {
  order: ORDER_LABELS,
  receipt: RECEIPT_LABELS,
  return: RETURN_LABELS,
};
/**
 * Function procurementStatusLabel
 *
 * @description
 * Resolves server status into a readable translated label with a forward-compatible fallback.
 *
 * @access public
 * @since unreleased
 *
 * @param {'order' | 'receipt' | 'return'} family - Resource lifecycle.
 * @param {string} value - Server status.
 *
 * @returns {string} Translated status label.
 */
export function procurementStatusLabel(
  family: 'order' | 'receipt' | 'return',
  value: string,
): string {
  return STATUS_LABELS[family][value] ?? value.replaceAll('_', ' ');
}
