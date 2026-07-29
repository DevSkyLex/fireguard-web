/**
 * Interface MarkConversationReadInput
 * @interface MarkConversationReadInput
 *
 * @description
 * Merge payload for `PATCH /api/conversations/{id}/read`.
 *
 * The response is the snapshot taken *before* the marker was written, so
 * `unreadCount` and `updatedAt` will not reflect the change — patch the local
 * row instead of merging.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface MarkConversationReadInput {
  /** Bare message id to read up to. Omit to mark everything read. */
  readonly lastReadMessageId?: string;
}
