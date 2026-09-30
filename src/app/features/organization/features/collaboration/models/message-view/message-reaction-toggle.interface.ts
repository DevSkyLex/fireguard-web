/**
 * Interface MessageReactionToggle
 * @interface MessageReactionToggle
 *
 * @description
 * A reader pressing one emoji on one message, travelling up from the row to
 * whoever holds the tally.
 * It carries no direction: whether the press adds or withdraws a reaction is
 * already answered by the message, so asking the row to work it out would mean
 * answering it twice and letting the two disagree.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface MessageReactionToggle {
  /**
   * Property messageId
   * @readonly
   *
   * @description
   * Identifies the message addressed by this operation.
   *
   * @access public
   *
   * @type {string}
   */
  readonly messageId: string;

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
