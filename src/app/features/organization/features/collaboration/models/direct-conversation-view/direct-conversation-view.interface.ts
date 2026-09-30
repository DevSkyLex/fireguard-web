/**
 * Interface DirectConversationView
 * @interface DirectConversationView
 *
 * @description
 * One row of the direct-conversation list, with its counterpart already
 * resolved to a name and a face.
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
  /**
   * Property id
   * @readonly
   *
   * @description
   * Uniquely identifies this direct conversation.
   *
   * @access public
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property counterpartMemberId
   * @readonly
   *
   * @description
   * Bare member reference supplied by the conversation API, independent of directory access.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string | null}
   */
  readonly counterpartMemberId: string | null;

  /**
   * Property counterpartName
   * @readonly
   *
   * @description
   * Provides the neutral display name for the other participant.
   *
   * @access public
   *
   * @type {string}
   */
  readonly counterpartName: string;

  /**
   * Property counterpartAvatarUrl
   * @readonly
   *
   * @description
   * Provides the avatar image URL for the other participant when available.
   *
   * @access public
   *
   * @type {string}
   */
  readonly counterpartAvatarUrl?: string;

  /**
   * Property isResolved
   * @readonly
   *
   * @description
   * Whether the counterpart resolved, so the row can show a placeholder instead.
   *
   * @access public
   *
   * @type {boolean}
   */
  readonly isResolved: boolean;

  /**
   * Property lastMessageAt
   * @readonly
   *
   * @description
   * ISO instant of the last message, absent on a conversation with none.
   *
   * @access public
   *
   * @type {string}
   */
  readonly lastMessageAt?: string;

  /**
   * Property unreadCount
   * @readonly
   *
   * @description
   * Counts unread messages in this direct conversation.
   *
   * @access public
   *
   * @type {number}
   */
  readonly unreadCount: number;
}
