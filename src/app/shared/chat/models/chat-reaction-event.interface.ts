/**
 * Interface ChatReactionEvent
 * @interface ChatReactionEvent
 *
 * @description
 * Which message a reaction was aimed at, and with what.
 *
 * The thread emits the message id alongside the emoji because it renders many
 * rows and the consumer cannot tell them apart otherwise.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface ChatReactionEvent {
  readonly messageId: string;
  readonly emoji: string;
}
