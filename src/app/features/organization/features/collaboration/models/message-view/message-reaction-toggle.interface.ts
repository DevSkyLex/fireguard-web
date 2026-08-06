/**
 * Interface MessageReactionToggle
 * @interface MessageReactionToggle
 *
 * @description
 * A reader pressing one emoji on one message, travelling up from the row to
 * whoever holds the tally.
 *
 * It carries no direction: whether the press adds or withdraws a reaction is
 * already answered by the message, so asking the row to work it out would mean
 * answering it twice and letting the two disagree.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface MessageReactionToggle {
  readonly messageId: string;
  readonly emoji: string;
}
