/**
 * Interface DirectConversationView
 * @interface DirectConversationView
 *
 * @description
 * One row of the direct-conversation list, with its counterpart already
 * resolved to a name and a face.
 *
 * {@link counterpartName} is never a raw member id: only the list endpoint
 * reports a counterpart at all, and reading the member directory needs a
 * permission messaging does not imply, so when either is missing the page
 * substitutes a neutral label rather than letting a UUID reach the screen.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface DirectConversationView {
  readonly id: string;
  readonly counterpartName: string;
  readonly counterpartAvatarUrl?: string;
  /** Whether the counterpart resolved, so the row can show a placeholder instead. */
  readonly isResolved: boolean;
  /** ISO instant of the last message, absent on a conversation with none. */
  readonly lastMessageAt?: string;
  readonly unreadCount: number;
}
