/**
 * Type ProcurementReceiptStatus
 *
 * @description
 * Physical receipts remain retained while awaiting individual park identities.
 *
 * @type {ProcurementReceiptStatus}
 */
export type ProcurementReceiptStatus =
  | 'awaiting_individualization'
  | 'individualized'
  | 'stock_received'
  | 'returned';
