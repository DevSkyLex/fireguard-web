/**
 * Interface PlanTransform
 *
 * @description
 * The pan/zoom state applied to a plan viewer's stage: a CSS
 * `translate(x, y) scale(scale)` around the stage's own center. `x`/`y` are
 * viewport pixels, `scale` is unitless and 1 at the stage's natural size.
 *
 * @since 1.0.0
 */
export interface PlanTransform {
  readonly x: number;
  readonly y: number;
  readonly scale: number;
}

/**
 * Interface PlanViewportSize
 *
 * @description
 * A width/height pair in pixels — either the viewport a plan is shown
 * through, or the natural (unscaled) size of the plan content itself.
 *
 * @since 1.0.0
 */
export interface PlanViewportSize {
  readonly width: number;
  readonly height: number;
}

/**
 * Interface PlanPoint
 *
 * @description A point in viewport-relative pixel coordinates.
 * @since 1.0.0
 */
export interface PlanPoint {
  readonly x: number;
  readonly y: number;
}
