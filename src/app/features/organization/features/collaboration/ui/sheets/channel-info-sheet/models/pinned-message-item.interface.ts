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
  readonly id: string;
  /** Never blank — resolving it is the page's job. */
  readonly authorName: string;
  /** ISO instant the message was written. */
  readonly createdAt: string;
  /** Rendered HTML. Empty on a tombstone, which draws a placeholder instead. */
  readonly bodyHtml: string;
  readonly isDeleted: boolean;
  /** Whether the sheet offers this row's unpin control. */
  readonly canUnpin: boolean;
}
