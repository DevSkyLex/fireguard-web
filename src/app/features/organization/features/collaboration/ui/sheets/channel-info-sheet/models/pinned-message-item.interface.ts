/**
 * Interface PinnedMessageItem
 * @interface PinnedMessageItem
 *
 * @description
 * One pinned message as {@link ChannelInfoSheet} lists it: rendered, named,
 * and carrying whether the reader may withdraw the pin — the pinning member
 * or a holder of `organization.messaging.manage`, mirroring the server's own
 * check without replacing it.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface PinnedMessageItem {
  /**
   * Property id
   * @readonly
   *
   * @description
   * Uniquely identifies this pinned message item.
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
   * Never blank — resolving it is the page's job.
   *
   * @access public
   *
   * @type {string}
   */
  readonly authorName: string;

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
   * Indicates whether this pinned message item is deleted.
   *
   * @access public
   *
   * @type {boolean}
   */
  readonly isDeleted: boolean;

  /**
   * Property canUnpin
   * @readonly
   *
   * @description
   * Whether the sheet offers this row's unpin control.
   *
   * @access public
   *
   * @type {boolean}
   */
  readonly canUnpin: boolean;
}
