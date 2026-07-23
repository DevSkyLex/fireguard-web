import type { HydraItem } from '@core/api/models';

/**
 * Interface ConversationAttachmentOutput
 * @interface ConversationAttachmentOutput
 *
 * @description
 * A file uploaded to a conversation, as listed by
 * `GET /api/conversations/{id}/attachments`.
 *
 * A superset of the `MessageAttachmentSummary` embedded in a message: it adds
 * {@link message}, {@link conversation}, {@link uploadedByMember} and
 * {@link revision}. The two are not interchangeable.
 *
 * Deleting a message does **not** delete its attachments, so this list can
 * surface files from tombstoned messages.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface ConversationAttachmentOutput extends HydraItem {
  /** Bare UUID. The entity key — `@id` is a per-request Skolem genid. */
  readonly id: string;
  /** IRI `/api/messages/{id}`, which has no GET route. Treat it as opaque. */
  readonly message: string;
  /** IRI `/api/conversations/{id}`. */
  readonly conversation: string;
  /** IRI `/api/organizations/{orgId}/members/{memberId}`, not dereferenceable. */
  readonly uploadedByMember: string;
  /**
   * Authenticated route. It forces `Content-Disposition: attachment` and is not
   * public, so it cannot be used in `<img src>`, `<a href>` or `window.open` —
   * it has to be fetched with the bearer token and turned into a blob URL.
   */
  readonly contentUrl: string;
  /** Untrusted original file name — never render it as HTML. */
  readonly fileName: string;
  /** Server-sniffed, from the upload allow-list. */
  readonly mimeType: string;
  readonly size: number;
  readonly label?: string;
  /**
   * Always `1` on this list: the factory behind it never assigns the real
   * value. Never drive a delete precondition from it.
   */
  readonly revision: number;
  readonly uploadedAt: string;
}
