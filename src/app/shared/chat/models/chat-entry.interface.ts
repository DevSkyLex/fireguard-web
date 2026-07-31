import type { ChatMessageItem } from './chat-message-item.interface';

/**
 * Type ChatEntry
 * @typedef ChatEntry
 *
 * @description
 * One thing a conversation draws, in render order: either a date rule or a
 * message.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export type ChatEntry<TData = unknown> = ChatDaySeparator | ChatMessageEntry<TData>;

/**
 * Interface ChatDaySeparator
 * @interface ChatDaySeparator
 *
 * @description
 * The rule marking where the calendar day changes.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface ChatDaySeparator {
  readonly kind: 'day';
  /** Local `YYYY-MM-DD`. A key for tracking, never a display value. */
  readonly day: string;
  /** The day's first message instant — what actually gets formatted. */
  readonly at: string;
}

/**
 * Interface ChatMessageEntry
 * @interface ChatMessageEntry
 *
 * @description
 * A message, plus whether it carries on the previous author's run.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface ChatMessageEntry<TData = unknown> {
  readonly kind: 'message';
  readonly message: ChatMessageItem<TData>;
  readonly continuation: boolean;
}
