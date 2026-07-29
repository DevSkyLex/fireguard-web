/**
 * Interface ActivityCell
 * @interface ActivityCell
 *
 * @description
 * One day of the activity heatmap: the raw count the API reported, plus the
 * intensity step it renders at.
 *
 * The API sends counts, not levels — the four-step ramp is a presentation
 * decision made client-side.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface ActivityCell {
  /** `YYYY-MM-DD`, **UTC** — the day the API bucketed by. */
  readonly bucket: string;
  readonly count: number;
  /** 0 for a silent day, then 1–3 by intensity. */
  readonly level: ActivityLevel;
}

/**
 * Type ActivityLevel
 * @typedef ActivityLevel
 *
 * @description
 * Intensity step of an {@link ActivityCell}.
 *
 * @since 1.0.0
 */
export type ActivityLevel = 0 | 1 | 2 | 3;
