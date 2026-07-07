/**
 * Interface MemberOption
 * @interface MemberOption
 *
 * @description
 * Member selector option carrying a guaranteed human-readable label, decoupling
 * the role-assignment form's dropdown from the raw member transport shape.
 *
 * @since 1.0.0
 */
export interface MemberOption {
  /** Member identifier. */
  readonly id: string;
  /** Resolved display label (display name, full name, or fallback id). */
  readonly label: string;
}
