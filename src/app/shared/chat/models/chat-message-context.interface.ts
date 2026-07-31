import type { ChatMessageItem } from './chat-message-item.interface';

/**
 * Interface ChatMessageContext
 * @interface ChatMessageContext
 *
 * @description
 * Context handed to an `appChatMessageExtra` template, so `let-message` narrows
 * to the message being rendered rather than arriving as `any`.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface ChatMessageContext<TData = unknown> {
  readonly $implicit: ChatMessageItem<TData>;
}
