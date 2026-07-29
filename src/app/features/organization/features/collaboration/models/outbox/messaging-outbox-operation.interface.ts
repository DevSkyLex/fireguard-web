import type { PostMessageInput } from '@features/organization/features/collaboration/models';

/**
 * Type MessagingOutboxType
 * @typedef MessagingOutboxType
 *
 * @description
 * Kinds of work the messaging outbox replays.
 *
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
  readonly 'message.send': {
    readonly conversationId: string;
    /** Becomes the message id, which is what makes the replay safe. */
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
 *
 * `status` and `error` are optional so a row written by an earlier version
 * reads back as pending rather than as an unknown state.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface MessagingOutboxOperationFor<Type extends MessagingOutboxType> {
  /** Outbox row id — not the message id. */
  readonly id: string;
  /** Conversation the work belongs to, so replay can preserve per-thread order. */
  readonly conversationId: string;
  readonly type: Type;
  readonly payload: MessagingOutboxPayloadMap[Type];
  /** ISO-8601, monotonic within a session so same-millisecond writes still order. */
  readonly createdAt: string;
  readonly status?: 'pending' | 'failed';
  readonly error?: string | null;
}

/**
 * Type MessagingOutboxOperation
 * @typedef MessagingOutboxOperation
 *
 * @description
 * Any queued operation.
 *
 * @since 1.0.0
 */
export type MessagingOutboxOperation = {
  [Type in MessagingOutboxType]: MessagingOutboxOperationFor<Type>;
}[MessagingOutboxType];
