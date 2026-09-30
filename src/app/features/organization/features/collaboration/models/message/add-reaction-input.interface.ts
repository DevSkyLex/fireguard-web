/**
 * Interface AddReactionInput
 * @interface AddReactionInput
 *
 * @description
 * Payload for `POST /api/messages/{id}/reactions`. Idempotent: reacting twice
 * with the same emoji answers `200` and changes nothing.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface AddReactionInput {
  /**
   * Property emoji
   * @readonly
   *
   * @description
   * Provides the Unicode reaction selected for this message.
   *
   * @access public
   *
   * @type {string}
   */
  readonly emoji: string;
}
