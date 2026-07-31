/**
 * Interface MentionQuery
 * @interface MentionQuery
 *
 * @description
 * The `@…` the caret is currently sitting in, as a range over the draft plus
 * the term typed so far. Accepting a candidate replaces exactly `[start, end)`.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface MentionQuery {
  /** Index of the `@`. */
  readonly start: number;
  /** Caret position — the end of the replaced range, exclusive. */
  readonly end: number;
  /** What was typed after the `@`, possibly empty. */
  readonly term: string;
}
