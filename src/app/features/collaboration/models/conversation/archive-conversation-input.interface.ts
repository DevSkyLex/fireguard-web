/**
 * Interface ArchiveConversationInput
 * @interface ArchiveConversationInput
 *
 * @description
 * Merge payload for `PATCH /api/conversations/{id}`.
 *
 * Always send `isArchived` explicitly: the server defaults it to `true`, so an
 * empty payload archives rather than doing nothing.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface ArchiveConversationInput {
  readonly isArchived?: boolean;
}
