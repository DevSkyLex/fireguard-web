import type { CallState } from '@core/request-state';
import type { ConversationReceiptPositionOutput } from '@features/organization/features/collaboration/models';

/**
 * Interface MessageThreadState
 * @interface MessageThreadState
 *
 * @description
 * Auxiliary state for {@link MessageThreadStore}. The messages themselves live
 * in the `withEntities` collection, keyed by their scalar `id`.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface MessageThreadState {
  /**
   * Property readGeneration
   * @readonly
   *
   * @description
   * Generation distinguishing repeated visits to the same conversation.
   *
   * @access public
   *
   * @type {number}
   */
  readonly readGeneration: number;

  /**
   * Property conversationId
   * @readonly
   *
   * @description
   * Conversation the loaded page belongs to, or `null` before the first load.
   *
   * @access public
   *
   * @type {string | null}
   */
  readonly conversationId: string | null;

  /**
   * Property total
   * @readonly
   *
   * @description
   * Server-reported total. Paging must be driven from this, not the row count.
   *
   * @access public
   *
   * @type {number}
   */
  readonly total: number;

  /**
   * Property oldestLoadedPage
   * @readonly
   *
   * @description
   * The API returns messages oldest-first, so the *last* page holds the newest
   * ones and a thread opens there. Reading history therefore walks page numbers
   * **down** from that page, and this marks how far down it has gone.
   *
   * @access public
   *
   * @type {number}
   */
  readonly oldestLoadedPage: number;

  /**
   * Property newestLoadedPage
   * @readonly
   *
   * @description
   * newest end of the conversation, and the page a background refresh re-reads.
   *
   * @access public
   *
   * @type {number}
   */
  readonly newestLoadedPage: number;

  /**
   * Property listCallState
   * @readonly
   *
   * @description
   * `GET /conversations/{id}/messages`.
   *
   * @access public
   *
   * @type {CallState}
   */
  readonly listCallState: CallState;

  /**
   * Property postCallState
   * @readonly
   *
   * @description
   * Posting.
   *
   * @access public
   *
   * @type {CallState}
   */
  readonly postCallState: CallState;

  /**
   * Property outboxCallState
   * @readonly
   *
   * @description
   * Local outbox restoration after a successful conversation read.
   *
   * @access public
   *
   * @type {CallState}
   */
  readonly outboxCallState: CallState;

  /**
   * Property interactionCallState
   * @readonly
   *
   * @description
   * Reactions, pins and saves — light, frequent, and worth keeping apart from posting.
   *
   * @access public
   *
   * @type {CallState}
   */
  readonly interactionCallState: CallState;

  /**
   * Property editCallState
   * @readonly
   *
   * @description
   * Editing a message — its own state so the edit dialog can busy-lock and show its error inline.
   *
   * @access public
   *
   * @type {CallState}
   */
  readonly editCallState: CallState;

  /**
   * Property deleteCallState
   * @readonly
   *
   * @description
   * Tombstone deletion — its own state so the confirm dialog stays open, busy-locked, until it
   * settles.
   *
   * @access public
   *
   * @type {CallState}
   */
  readonly deleteCallState: CallState;

  /**
   * Property realtimeTopic
   * @readonly
   *
   * @description
   * Kept so the store can watch that topic's health and catch up after a
   * reconnection — the hub replays nothing.
   *
   * @access public
   *
   * @type {string | null}
   */
  readonly realtimeTopic: string | null;

  /**
   * Property receiptPositions
   * @readonly
   *
   * @description
   * Browser-confirmed participant positions restored from the API.
   *
   * @access public
   *
   * @type {readonly ConversationReceiptPositionOutput[]}
   */
  readonly receiptPositions: readonly ConversationReceiptPositionOutput[];

  /**
   * Property receiptsCallState
   * @readonly
   *
   * @description
   * Tracks the request state for receipts.
   *
   * @access public
   *
   * @type {CallState}
   */
  readonly receiptsCallState: CallState;

  /**
   * Property deliveryCallState
   * @readonly
   *
   * @description
   * Tracks the request state for delivery.
   *
   * @access public
   *
   * @type {CallState}
   */
  readonly deliveryCallState: CallState;

  /**
   * Property typingCallState
   * @readonly
   *
   * @description
   * Tracks the request state for typing.
   *
   * @access public
   *
   * @type {CallState}
   */
  readonly typingCallState: CallState;

  /**
   * Property lastDeliveryAttemptId
   * @readonly
   *
   * @description
   * Avoids repeatedly acknowledging the same loaded message.
   *
   * @access public
   *
   * @type {string | null}
   */
  readonly lastDeliveryAttemptId: string | null;

  /**
   * Property lastReadAttemptId
   * @readonly
   *
   * @description
   * Avoids repeatedly moving the same visible read position.
   *
   * @access public
   *
   * @type {string | null}
   */
  readonly lastReadAttemptId: string | null;

  /**
   * Property typingMemberIds
   * @readonly
   *
   * @description
   * Other members with an unexpired typing signal.
   *
   * @access public
   *
   * @type {readonly string[]}
   */
  readonly typingMemberIds: readonly string[];

  /**
   * Property pendingMessageIds
   * @readonly
   *
   * @description
   * Kept beside the collection rather than as a field on `MessageOutput`: the
   * entity mirrors the wire contract, and "not sent yet" is a fact about this
   * client, not about the message.
   *
   * @access public
   *
   * @type {readonly string[]}
   */
  readonly pendingMessageIds: readonly string[];

  /**
   * Property failedMessageIds
   * @readonly
   *
   * @description
   * Optimistic messages whose send failed and that are waiting on the member.
   *
   * @access public
   *
   * @type {readonly string[]}
   */
  readonly failedMessageIds: readonly string[];
}
