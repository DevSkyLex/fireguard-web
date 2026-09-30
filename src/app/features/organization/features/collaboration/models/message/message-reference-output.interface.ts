import type { MessageReferenceType } from './message-reference-type.type';

/**
 * Interface MessageReferenceOutput
 * @interface MessageReferenceOutput
 *
 * @description
 * A structured link from a message to a domain record.
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
  /**
   * Property type
   * @readonly
   *
   * @description
   * Classifies this message reference for feature-specific handling.
   *
   * @access public
   *
   * @type {MessageReferenceType}
   */
  readonly type: MessageReferenceType;

  /**
   * Property id
   * @readonly
   *
   * @description
   * Bare record UUID — not an IRI.
   *
   * @access public
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property label
   * @readonly
   *
   * @description
   * Provides the text displayed to identify this message reference.
   *
   * @access public
   *
   * @type {string | null}
   */
  readonly label: string | null;

  /**
   * Property code
   * @readonly
   *
   * @description
   * Carries the optional reference code for the linked resource.
   *
   * @access public
   *
   * @type {string | null}
   */
  readonly code: string | null;
}
