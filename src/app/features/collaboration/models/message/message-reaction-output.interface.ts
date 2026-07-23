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
  readonly emoji: string;
  readonly count: number;
  /** Whether the acting member reacted with this emoji. */
  readonly reactedByMe: boolean;
}
