import type { PostMessageInput } from '@features/organization/features/collaboration/models';

/**
 * Type MessagingOutboxType
 *
 * @description
 * Kinds of work the messaging outbox replays.
 * Only `message.send` today, and deliberately so: an operation may be queued
 * **only** if replaying it twice is harmless. Sending qualifies since the
 * client mints the message id (`PUT .../messages/{clientId}`), and reactions,
 * pins and saves qualify because the server swallows their duplicates — but
 * marking a conversation read does **not**: the server's upsert has no
 * monotonic guard, so a stale marker replayed later moves the read pointer
 * backwards.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @type
 * @type MessagingOutboxType
 */
export type MessagingOutboxType = 'message.send';

/**
 * Interface MessagingOutboxPayloadMap
 * @interface MessagingOutboxPayloadMap
 *
 * @description
 * Payload carried by each operation kind.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface MessagingOutboxPayloadMap {
  /**
   * Property 'message.send'
   * @readonly
   *
   * @description
   * Carries the conversation, client-minted message id, and input used to replay a send
   * idempotently.
   *
   * @access public
   *
   * @type {MessagingOutboxPayloadMap['message.send']}
   */
  readonly 'message.send': {
    readonly conversationId: string;

    /**
     * Property clientId
     * @readonly
     *
     * @description
     * Becomes the message id, which is what makes the replay safe.
     *
     * @access public
     *
     * @type {string}
     */
    readonly clientId: string;
    readonly input: PostMessageInput;
  };
}

/**
 * Interface MessagingOutboxOperationFor
 * @interface MessagingOutboxOperationFor
 *
 * @description
 * One queued operation.
 * `status` and `error` are optional so a row written by an earlier version
 * reads back as pending rather than as an unknown state.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface MessagingOutboxOperationFor<Type extends MessagingOutboxType> {
  /**
   * Property id
   * @readonly
   *
   * @description
   * Outbox row id — not the message id.
   *
   * @access public
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property conversationId
   * @readonly
   *
   * @description
   * Conversation the work belongs to, so replay can preserve per-thread order.
   *
   * @access public
   *
   * @type {string}
   */
  readonly conversationId: string;

  /**
   * Property type
   * @readonly
   *
   * @description
   * Selects the operation kind and, through its type parameter, the matching payload shape.
   *
   * @access public
   *
   * @type {Type}
   */
  readonly type: Type;

  /**
   * Property payload
   * @readonly
   *
   * @description
   * Carries the fields required to replay the operation selected by type.
   *
   * @access public
   *
   * @type {MessagingOutboxPayloadMap[Type]}
   */
  readonly payload: MessagingOutboxPayloadMap[Type];

  /**
   * Property createdAt
   * @readonly
   *
   * @description
   * ISO-8601, monotonic within a session so same-millisecond writes still order.
   *
   * @access public
   *
   * @type {string}
   */
  readonly createdAt: string;

  /**
   * Property status
   * @readonly
   *
   * @description
   * Indicates whether this queued operation is pending replay or has failed.
   *
   * @access public
   *
   * @type {'pending' | 'failed'}
   */
  readonly status?: 'pending' | 'failed';

  /**
   * Property error
   * @readonly
   *
   * @description
   * Stores the normalized failure detail from the last replay attempt, when one exists.
   *
   * @access public
   *
   * @type {string | null}
   */
  readonly error?: string | null;
}

/**
 * Type MessagingOutboxOperation
 *
 * @description
 * Any queued operation.
 *
 * @since 1.0.0
 *
 * @type
 * @type MessagingOutboxOperation
 */
export type MessagingOutboxOperation = {
  [Type in MessagingOutboxType]: MessagingOutboxOperationFor<Type>;
}[MessagingOutboxType];
