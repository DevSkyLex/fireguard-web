/**
 * Interface InterventionMentionSegment
 * @interface InterventionMentionSegment
 *
 * @description
 * One run of a comment body split around its `@{memberUuid}` mention tokens
 * — literal text, or a resolved mention carrying the mentioned member's
 * uuid. The composer's live chip row and the activity thread's rendering
 * both consume the same split.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface InterventionMentionSegment {
  /** Whether this run is literal text or a resolved mention token. */
  readonly kind: 'text' | 'mention';
  /** The literal text for a `text` run, the mentioned member's uuid for a `mention` run. */
  readonly value: string;
}
