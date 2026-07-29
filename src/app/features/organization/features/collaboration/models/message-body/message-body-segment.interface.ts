/**
 * Interface MessageBodySegment
 * @interface MessageBodySegment
 *
 * @description
 * One piece of a tokenized message body: either a run of sanitized HTML, or a
 * mention of an organization member.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface MessageBodySegment {
  /** `text` carries server-sanitized HTML; `mention` carries a member id. */
  readonly kind: 'text' | 'mention';
  /** Sanitized HTML for a text segment, the member id for a mention. */
  readonly value: string;
}
