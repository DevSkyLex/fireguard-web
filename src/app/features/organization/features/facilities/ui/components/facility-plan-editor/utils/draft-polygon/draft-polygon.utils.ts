/** The minimum vertex count a polygon needs before it can be closed. */
const MIN_CLOSABLE_POLYGON_VERTICES = 3;

/**
 * Function screenPointToNormalized
 *
 * @description
 * Converts a screen (`clientX`/`clientY`) point to normalized `[0, 1]` image
 * coordinates, given the current screen bounding rect of the plan's
 * image-sized capture layer. Since that layer is rendered inside the plan
 * viewer's transformed stage, its rendered `width`/`height` already reflect
 * the current zoom — dividing by them yields the normalized fraction
 * directly, with no separate pan/zoom math needed. Each axis is clamped to
 * `[0, 1]` so a drag that overshoots the plan's edge still lands a valid
 * point; a zero-sized rect (not yet laid out) falls back to `[0, 0]`.
 *
 * @access public
 * @since 1.4.0
 *
 * @param {{ x: number; y: number }} point - The screen point, typically `{ x: event.clientX, y: event.clientY }`.
 * @param {{ left: number; top: number; width: number; height: number }} rect - The capture layer's current bounding rect.
 *
 * @returns {readonly [number, number]} The point in normalized `[0, 1]` image coordinates.
 */
export function screenPointToNormalized(
  point: { readonly x: number; readonly y: number },
  rect: {
    readonly left: number;
    readonly top: number;
    readonly width: number;
    readonly height: number;
  },
): readonly [number, number] {
  if (rect.width <= 0 || rect.height <= 0) return [0, 0];

  const x: number = clamp01((point.x - rect.left) / rect.width);
  const y: number = clamp01((point.y - rect.top) / rect.height);

  return [x, y];
}

/**
 * Function isTapGesture
 *
 * @description
 * Whether a pointer sequence's down/up points are close enough to count as a
 * tap (add a vertex / place a pin) rather than a drag pan — the plan viewer
 * itself starts tracking a drag on every `pointerdown`, so this is what lets
 * a stationary click coexist with that without also nudging the transform.
 *
 * @access public
 * @since 1.4.0
 *
 * @param {{ x: number; y: number }} down - Where the pointer went down.
 * @param {{ x: number; y: number }} up - Where the pointer came back up.
 * @param {number} thresholdPx - The maximum travel distance still counted as a tap.
 *
 * @returns {boolean} `true` when the two points are within `thresholdPx` of each other.
 */
export function isTapGesture(
  down: { readonly x: number; readonly y: number },
  up: { readonly x: number; readonly y: number },
  thresholdPx: number,
): boolean {
  return Math.hypot(up.x - down.x, up.y - down.y) <= thresholdPx;
}

/**
 * Function addDraftVertex
 *
 * @description Appends a vertex to a draft polygon's point list.
 * @access public
 * @since 1.4.0
 * @param {ReadonlyArray<readonly [number, number]>} points - The current draft points.
 * @param {readonly [number, number]} point - The vertex to append.
 * @returns {ReadonlyArray<readonly [number, number]>} The points with `point` appended.
 */
export function addDraftVertex(
  points: ReadonlyArray<readonly [number, number]>,
  point: readonly [number, number],
): ReadonlyArray<readonly [number, number]> {
  return [...points, point];
}

/**
 * Function undoDraftVertex
 *
 * @description Removes the last vertex from a draft polygon's point list, if any.
 * @access public
 * @since 1.4.0
 * @param {ReadonlyArray<readonly [number, number]>} points - The current draft points.
 * @returns {ReadonlyArray<readonly [number, number]>} The points without their last entry.
 */
export function undoDraftVertex(
  points: ReadonlyArray<readonly [number, number]>,
): ReadonlyArray<readonly [number, number]> {
  return points.slice(0, -1);
}

/**
 * Function isClosablePolygon
 *
 * @description Whether a draft polygon has enough vertices to submit (the backend requires at least three).
 * @access public
 * @since 1.4.0
 * @param {ReadonlyArray<readonly [number, number]>} points - The current draft points.
 * @returns {boolean} `true` when `points` holds at least three vertices.
 */
export function isClosablePolygon(points: ReadonlyArray<readonly [number, number]>): boolean {
  return points.length >= MIN_CLOSABLE_POLYGON_VERTICES;
}

/**
 * Function clamp01
 * @access private
 * @since 1.4.0
 * @param {number} value - The candidate value.
 * @returns {number} `value` confined to `[0, 1]`.
 */
function clamp01(value: number): number {
  return Math.min(Math.max(value, 0), 1);
}
