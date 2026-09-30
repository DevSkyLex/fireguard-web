/**
 * Interface MessageReactionOutput
 * @interface MessageReactionOutput
 *
 * @description
 * One emoji tally on a message, with whether the acting member is part of it.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface MessageReactionOutput {
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

  /**
   * Property count
   * @readonly
   *
   * @description
   * Counts members who used this reaction.
   *
   * @access public
   *
   * @type {number}
   */
  readonly count: number;

  /**
   * Property reactedByMe
   * @readonly
   *
   * @description
   * Whether the acting member reacted with this emoji.
   *
   * @access public
   *
   * @type {boolean}
   */
  readonly reactedByMe: boolean;
}
