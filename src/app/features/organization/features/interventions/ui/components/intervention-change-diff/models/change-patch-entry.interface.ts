/**
 * Interface ChangePatchEntry
 * @interface ChangePatchEntry
 *
 * @description
 * One human-readable row of a proposed change patch: a humanized field label and
 * its formatted proposed value, ready to render in the review change diff.
 */
export interface ChangePatchEntry {
  /** Humanized field label (e.g. `"Planned start at"`). */
  readonly field: string;
  /** Formatted proposed value, or an em dash when cleared. */
  readonly value: string;
}
