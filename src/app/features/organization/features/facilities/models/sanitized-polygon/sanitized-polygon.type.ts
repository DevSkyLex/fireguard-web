/**
 * Interface SanitizedPolygonAccepted
 * @interface SanitizedPolygonAccepted
 *
 * @description
 * A room or floor contour that survived {@link sanitizePolygon} — finite,
 * in-bounds, deduplicated, free of collinear runs and self-intersection,
 * with a consistent winding order.
 *
 * @since 1.0.0
 */
export interface SanitizedPolygonAccepted {
  /** Discriminant — narrows away {@link SanitizedPolygonRejected}. */
  readonly status: 'accepted';

  /** The sanitized polygon's vertices, in normalized `[0, 1]` image coordinates. */
  readonly points: ReadonlyArray<readonly [number, number]>;
}

/**
 * Interface SanitizedPolygonRejected
 * @interface SanitizedPolygonRejected
 *
 * @description
 * A contour {@link sanitizePolygon} could not turn into a displayable
 * polygon — out-of-range coordinates, fewer than three distinct vertices,
 * a near-zero area, or a self-intersecting (bow-tie) outline.
 *
 * @since 1.0.0
 */
export interface SanitizedPolygonRejected {
  /** Discriminant — narrows away {@link SanitizedPolygonAccepted}. */
  readonly status: 'rejected';
}

/**
 * Type SanitizedPolygonResult
 * @type {SanitizedPolygonResult}
 *
 * @description
 * The outcome of sanitizing one room or floor contour. Forces a caller to
 * branch on `status` before reading `points`, so a rejected contour cannot
 * be extruded by mistake — the caller instead counts rejections and renders
 * whatever the rest of the sanitized set produced.
 *
 * @since 1.0.0
 */
export type SanitizedPolygonResult = SanitizedPolygonAccepted | SanitizedPolygonRejected;
