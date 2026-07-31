/**
 * Interface ChatReaction
 * @interface ChatReaction
 *
 * @description
 * One emoji tallied across everyone who used it on a message.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface ChatReaction {
  /** The emoji itself, which is also its identity. */
  readonly emoji: string;
  readonly count: number;
  /** Whether the reader is one of the people counted. */
  readonly reactedByMe: boolean;
}
