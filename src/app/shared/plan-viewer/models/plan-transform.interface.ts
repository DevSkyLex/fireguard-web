/**
 * Interface PlanTransform
 * @interface PlanTransform
 *
 * @description
 * The pan/zoom state applied to a plan viewer's stage: a CSS
 * `translate(x, y) scale(scale)` around the stage's own center. `x`/`y` are
 * viewport pixels, `scale` is unitless and 1 at the stage's natural size.
 *
 * @since 1.0.0
 */
export interface PlanTransform {
  /**
   * Property x
   * @readonly
   *
   * @description
   * Horizontal pan offset in viewport pixels.
   *
   * @access public
   * @since unreleased
   *
   * @type {number}
   */
  readonly x: number;

  /**
   * Property y
   * @readonly
   *
   * @description
   * Vertical pan offset in viewport pixels.
   *
   * @access public
   * @since unreleased
   *
   * @type {number}
   */
  readonly y: number;

  /**
   * Property scale
   * @readonly
   *
   * @description
   * Unitless zoom multiplier, with 1 representing the natural plan size.
   *
   * @access public
   * @since unreleased
   *
   * @type {number}
   */
  readonly scale: number;
}

/**
 * Interface PlanViewportSize
 * @interface PlanViewportSize
 *
 * @description
 * A width/height pair in pixels — either the viewport a plan is shown
 * through, or the natural (unscaled) size of the plan content itself.
 *
 * @since 1.0.0
 */
export interface PlanViewportSize {
  /**
   * Property width
   * @readonly
   *
   * @description
   * Horizontal extent in pixels before any viewer transform is applied.
   *
   * @access public
   * @since unreleased
   *
   * @type {number}
   */
  readonly width: number;

  /**
   * Property height
   * @readonly
   *
   * @description
   * Vertical extent in pixels before any viewer transform is applied.
   *
   * @access public
   * @since unreleased
   *
   * @type {number}
   */
  readonly height: number;
}

/**
 * Interface PlanPoint
 * @interface PlanPoint
 *
 * @description
 * A point in viewport-relative pixel coordinates.
 *
 * @since 1.0.0
 */
export interface PlanPoint {
  /**
   * Property x
   * @readonly
   *
   * @description
   * Horizontal point coordinate in the viewport's pixel space.
   *
   * @access public
   * @since unreleased
   *
   * @type {number}
   */
  readonly x: number;

  /**
   * Property y
   * @readonly
   *
   * @description
   * Vertical point coordinate in the viewport's pixel space.
   *
   * @access public
   * @since unreleased
   *
   * @type {number}
   */
  readonly y: number;
}
