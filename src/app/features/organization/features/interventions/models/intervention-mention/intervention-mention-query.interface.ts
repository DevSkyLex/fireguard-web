/**
 * Interface InterventionMentionQuery
 * @interface InterventionMentionQuery
 *
 * @description
 * The `@…` the caret is currently sitting in while drafting a comment, as a
 * range over the draft plus the term typed so far. Accepting a candidate
 * replaces exactly `[start, end)`.
 *
 * Mirrors the collaboration feature's own caret-query shape
 * (`features/collaboration/models/composer/mention-query.interface.ts`)
 * rather than importing it — interventions may not depend on collaboration
 * internals, and the two features' insertion behaviors diverge (a comment
 * keeps the raw `@{uuid}` token instead of a picked label).
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface InterventionMentionQuery {
  /** Index of the `@`. */
  readonly start: number;
  /** Caret position — the end of the replaced range, exclusive. */
  readonly end: number;
  /** What was typed after the `@`, possibly empty. */
  readonly term: string;
}
