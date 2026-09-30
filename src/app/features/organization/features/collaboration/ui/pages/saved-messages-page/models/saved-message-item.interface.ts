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
  /**
   * Property id
   * @readonly
   *
   * @description
   * Uniquely identifies this saved message item.
   *
   * @access public
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property authorMemberId
   * @readonly
   *
   * @description
   * Bare member identity retained for organizational presence.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly authorMemberId: string;

  /**
   * Property authorName
   * @readonly
   *
   * @description
   * Never blank — the API's own `authorDisplayName`, or a neutral label.
   *
   * @access public
   *
   * @type {string}
   */
  readonly authorName: string;

  /**
   * Property isAuthorResolved
   * @readonly
   *
   * @description
   * Whether {@link authorName} is a real name, so the avatar draws a placeholder rather than
   * initials of the neutral label.
   *
   * @access public
   *
   * @type {boolean}
   */
  readonly isAuthorResolved: boolean;

  /**
   * Property createdAt
   * @readonly
   *
   * @description
   * ISO instant the message was written.
   *
   * @access public
   *
   * @type {string}
   */
  readonly createdAt: string;

  /**
   * Property bodyHtml
   * @readonly
   *
   * @description
   * Rendered HTML. Empty on a tombstone, which draws a placeholder instead.
   *
   * @access public
   *
   * @type {string}
   */
  readonly bodyHtml: string;

  /**
   * Property isDeleted
   * @readonly
   *
   * @description
   * Indicates whether this saved message item is deleted.
   *
   * @access public
   *
   * @type {boolean}
   */
  readonly isDeleted: boolean;

  /**
   * Property conversationLabel
   * @readonly
   *
   * @description
   * Where the bookmark lives: the channel's name, or a neutral direct-message label.
   *
   * @access public
   *
   * @type {string}
   */
  readonly conversationLabel: string;

  /**
   * Property link
   * @readonly
   *
   * @description
   * Router commands to the owning conversation.
   *
   * @access public
   *
   * @type {readonly string[]}
   */
  readonly link: readonly string[];
}
