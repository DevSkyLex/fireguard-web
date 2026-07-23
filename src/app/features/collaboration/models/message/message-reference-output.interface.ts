import type { MessageReferenceType } from './message-reference-type.type';

/**
 * Interface MessageReferenceOutput
 * @interface MessageReferenceOutput
 *
 * @description
 * A structured link from a message to a domain record.
 *
 * `label` and `code` are the only two genuinely nullable fields in the whole
 * messaging contract: they are serialized as a plain array rather than a DTO,
 * so `skip_null_values` never reaches them and the key is present with an
 * explicit `null`. Everywhere else, an absent value is `undefined`.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface MessageReferenceOutput {
  readonly type: MessageReferenceType;
  /** Bare record UUID — not an IRI. */
  readonly id: string;
  readonly label: string | null;
  readonly code: string | null;
}
