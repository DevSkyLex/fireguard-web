/**
 * Interface InterventionActivityBodySegment
 * @interface InterventionActivityBodySegment
 *
 * @description
 * One run of a comment's rendered body — literal text, or a `@{uuid}`
 * mention already resolved to display text and an optional role for the
 * hover title. Resolved once per row in {@link InterventionActivityThread}'s
 * `rows` computed rather than per binding, matching how every other
 * per-row derivation there is handled.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface InterventionActivityBodySegment {
  /** Whether this run is literal text or a resolved mention. */
  readonly kind: 'text' | 'mention';
  /** The literal text, or the mentioned member's display name (or the unknown-member fallback). */
  readonly text: string;
  /** The mentioned member's role, shown as the span's `title`; `null` for a text run or an unresolved mention. */
  readonly title: string | null;
}
