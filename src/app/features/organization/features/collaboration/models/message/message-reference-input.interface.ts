import type { MessageReferenceType } from './message-reference-type.type';

/**
 * Interface MessageReferenceInput
 * @interface MessageReferenceInput
 *
 * @description
 * A structured reference attached when posting or editing. At most five per
 * message; the server resolves each target inside the conversation's
 * organization before persisting.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface MessageReferenceInput {
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
   * Bare record UUID, at most 36 characters.
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
   * @type {string}
   */
  readonly label?: string;

  /**
   * Property code
   * @readonly
   *
   * @description
   * Carries the optional reference code for the linked resource.
   *
   * @access public
   *
   * @type {string}
   */
  readonly code?: string;
}
