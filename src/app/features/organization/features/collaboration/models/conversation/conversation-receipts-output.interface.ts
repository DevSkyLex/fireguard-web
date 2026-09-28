import type { HydraItem } from '@core/api/models';

/** A participant's confirmed positions, scoped to one private conversation. */
export interface ConversationReceiptPositionOutput {
  readonly memberId: string;
  readonly deliveredMessageId: string | null;
  readonly deliveredThroughAt: string | null;
  readonly readMessageId: string | null;
  readonly readThroughAt: string | null;
}

/** Snapshot used to restore receipt state after navigation or reconnection. */
export interface ConversationReceiptsOutput extends HydraItem {
  readonly receipts: readonly ConversationReceiptPositionOutput[];
}
