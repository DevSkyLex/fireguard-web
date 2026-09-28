/** Counts confirmed recipients and readers of one authored message. */
export interface MessageReceiptView {
  readonly kind: 'direct' | 'channel';
  readonly deliveredCount: number;
  readonly readCount: number;
}
