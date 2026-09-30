import type { HydraItem } from '@core/api/models';

/**
 * Interface ConversationReceiptPositionOutput
 * @interface
 *
 * @description
 * A participant's confirmed positions, scoped to one private conversation.
 */
export interface ConversationReceiptPositionOutput {
  /**
   * Property memberId
   * @readonly
   *
   * @description
   * Identifies the organization member associated with this record.
   *
   * @access public
   *
   * @type {string}
   */
  readonly memberId: string;

  /**
   * Property deliveredMessageId
   * @readonly
   *
   * @description
   * Identifies the latest message delivered to this member in the conversation.
   *
   * @access public
   *
   * @type {string | null}
   */
  readonly deliveredMessageId: string | null;

  /**
   * Property deliveredThroughAt
   * @readonly
   *
   * @description
   * Records the delivery time of the latest delivered message.
   *
   * @access public
   *
   * @type {string | null}
   */
  readonly deliveredThroughAt: string | null;

  /**
   * Property readMessageId
   * @readonly
   *
   * @description
   * Identifies the latest message this member has read in the conversation.
   *
   * @access public
   *
   * @type {string | null}
   */
  readonly readMessageId: string | null;

  /**
   * Property readThroughAt
   * @readonly
   *
   * @description
   * Records the read time of the latest read message.
   *
   * @access public
   *
   * @type {string | null}
   */
  readonly readThroughAt: string | null;
}

/**
 * Interface ConversationReceiptsOutput
 * @interface
 *
 * @description
 * Snapshot used to restore receipt state after navigation or reconnection.
 */
export interface ConversationReceiptsOutput extends HydraItem {
  /**
   * Property receipts
   * @readonly
   *
   * @description
   * Contains the delivery and read positions for conversation members.
   *
   * @access public
   *
   * @type {readonly ConversationReceiptPositionOutput[]}
   */
  readonly receipts: readonly ConversationReceiptPositionOutput[];
}
