/**
 * Interface SavedMessageItem
 * @interface SavedMessageItem
 *
 * @description
 * One bookmark as {@link SavedMessagesPage} draws it: rendered, named, and
 * linked to the conversation it lives in — the channel route when the
 * resolved conversation is a channel, the direct-messages route otherwise.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface SavedMessageItem {
  readonly id: string;
  /** Never blank — the API's own `authorDisplayName`, or a neutral label. */
  readonly authorName: string;
  /** ISO instant the message was written. */
  readonly createdAt: string;
  /** Rendered HTML. Empty on a tombstone, which draws a placeholder instead. */
  readonly bodyHtml: string;
  readonly isDeleted: boolean;
  /** Where the bookmark lives: the channel's name, or a neutral direct-message label. */
  readonly conversationLabel: string;
  /** Router commands to the owning conversation. */
  readonly link: readonly string[];
}
