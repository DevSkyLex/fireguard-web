/**
 * Interface ChatAttachment
 * @interface ChatAttachment
 *
 * @description
 * A file carried by a message, as far as the row is concerned: something to
 * name.
 *
 * Deliberately narrow. Downloading one is never a plain link — the owning
 * feature knows whether its route needs an Authorization header, and the row
 * has no business guessing.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface ChatAttachment {
  readonly id: string;
  /** Untrusted original file name — rendered as text, never as markup. */
  readonly fileName: string;
}
