import type { SanitizedPolygonResult } from '@features/organization/features/facilities/models';

/**
 * Constant POINT_EPSILON
 *
 * @description
 * Minimum distance, in normalized `[0, 1]` image coordinates, for two
 * points to be considered distinct. Anything closer is a duplicate vertex
 * or a zero-length segment.
 *
 * @since 1.0.0
 */
const POINT_EPSILON = 1e-6;

/**
 * Constant COLLINEAR_EPSILON
 *
 * @description
 * Maximum absolute cross-product magnitude for three consecutive vertices
 * to be treated as collinear. Cross products scale with area, so this
 * tolerance is far smaller than {@link POINT_EPSILON}.
 *
 * @since 1.0.0
 */
const COLLINEAR_EPSILON = 1e-9;

/**
 * Constant MIN_POLYGON_AREA
 *
 * @description
 * Minimum absolute shoelace area a sanitized polygon must reach to be
 * considered non-degenerate.
 *
 * @since 1.0.0
 */
const MIN_POLYGON_AREA = 1e-9;

/**
 * Function sanitizePolygon
 * @function sanitizePolygon
 *
 * @description
 * Turns one hand-drawn room or floor contour into a polygon safe to
 * extrude: rejects out-of-range coordinates, drops duplicate and
 * zero-length segments, collapses collinear runs, rejects a degenerate or
 * self-intersecting (bow-tie) outline, and normalizes the winding order.
 * Each polygon is sanitized independently — a rejection never throws, so a
 * caller processing many rooms can count the rejected ones and render the
 * rest.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {ReadonlyArray<readonly [number, number]>} points - The raw contour, in normalized `[0, 1]` image coordinates.
 *
 * @returns {SanitizedPolygonResult} The sanitized polygon, or a rejection.
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export function sanitizePolygon(
  points: ReadonlyArray<readonly [number, number]>,
): SanitizedPolygonResult {
  if (points.some(([x, y]) => !isFiniteInUnitRange(x) || !isFiniteInUnitRange(y))) {
    return { status: 'rejected' };
  }

  const simplified: ReadonlyArray<readonly [number, number]> = removeCollinearPoints(
    dedupePoints(points),
  );

  if (simplified.length < 3 || Math.abs(signedArea(simplified)) < MIN_POLYGON_AREA) {
    return { status: 'rejected' };
  }

  if (hasSelfIntersection(simplified)) {
    return { status: 'rejected' };
  }

  return { status: 'accepted', points: normalizeWinding(simplified) };
}

/**
 * Function isFiniteInUnitRange
 *
 * @description Whether a coordinate is finite and within `[0, 1]`.
 * @access private
 * @since 1.0.0
 *
 * @param {number} value - The coordinate to check.
 *
 * @returns {boolean} `true` when the coordinate is usable.
 */
function isFiniteInUnitRange(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 1;
}

/**
 * Function distance
 *
 * @description Euclidean distance between two points.
 * @access private
 * @since 1.0.0
 *
 * @param {readonly [number, number]} a - The first point.
 * @param {readonly [number, number]} b - The second point.
 *
 * @returns {number} The distance between `a` and `b`.
 */
function distance(a: readonly [number, number], b: readonly [number, number]): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

/**
 * Function dedupePoints
 *
 * @description
 * Drops consecutive duplicate vertices and zero-length segments, then the
 * closing duplicate between the first and last vertex.
 *
 * @access private
 * @since 1.0.0
 *
 * @param {ReadonlyArray<readonly [number, number]>} points - The raw contour.
 *
 * @returns {ReadonlyArray<readonly [number, number]>} The contour with duplicates removed.
 */
function dedupePoints(
  points: ReadonlyArray<readonly [number, number]>,
): ReadonlyArray<readonly [number, number]> {
  const deduped: Array<readonly [number, number]> = [];

  for (const point of points) {
    const last: readonly [number, number] | undefined = deduped.at(-1);
    if (last === undefined || distance(last, point) >= POINT_EPSILON) {
      deduped.push(point);
    }
  }

  while (
    deduped.length > 1 &&
    distance(deduped[0], deduped.at(-1) as readonly [number, number]) < POINT_EPSILON
  ) {
    deduped.pop();
  }

  return deduped;
}

/**
 * Function cross
 *
 * @description The 2D cross product of `o→a` and `o→b`.
 * @access private
 * @since 1.0.0
 *
 * @param {readonly [number, number]} o - The shared origin point.
 * @param {readonly [number, number]} a - The first ray's endpoint.
 * @param {readonly [number, number]} b - The second ray's endpoint.
 *
 * @returns {number} The signed cross-product magnitude.
 */
function cross(
  o: readonly [number, number],
  a: readonly [number, number],
  b: readonly [number, number],
): number {
  return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
}

/**
 * Function removeCollinearPoints
 *
 * @description
 * Repeatedly drops any vertex that lies on the line through its immediate
 * neighbours, until no more can be removed. A single pass is not always
 * enough for a run of more than two collinear vertices.
 *
 * @access private
 * @since 1.0.0
 *
 * @param {ReadonlyArray<readonly [number, number]>} points - The deduplicated contour.
 *
 * @returns {ReadonlyArray<readonly [number, number]>} The contour with intermediate collinear vertices removed.
 */
function removeCollinearPoints(
  points: ReadonlyArray<readonly [number, number]>,
): ReadonlyArray<readonly [number, number]> {
  let current: ReadonlyArray<readonly [number, number]> = points;
  let changed = true;

  while (changed && current.length > 2) {
    changed = false;
    const next: Array<readonly [number, number]> = [];

    for (let index = 0; index < current.length; index += 1) {
      const previous: readonly [number, number] =
        current[(index - 1 + current.length) % current.length];
      const point: readonly [number, number] = current[index];
      const nextPoint: readonly [number, number] = current[(index + 1) % current.length];

      if (Math.abs(cross(previous, point, nextPoint)) < COLLINEAR_EPSILON) {
        changed = true;
        continue;
      }

      next.push(point);
    }

    current = next;
  }

  return current;
}

/**
 * Function signedArea
 *
 * @description The shoelace signed area of a polygon; negative for clockwise winding.
 * @access private
 * @since 1.0.0
 *
 * @param {ReadonlyArray<readonly [number, number]>} points - The polygon's vertices, in order.
 *
 * @returns {number} The signed area.
 */
function signedArea(points: ReadonlyArray<readonly [number, number]>): number {
  let sum = 0;

  for (let index = 0; index < points.length; index += 1) {
    const [x1, y1]: readonly [number, number] = points[index];
    const [x2, y2]: readonly [number, number] = points[(index + 1) % points.length];
    sum += x1 * y2 - x2 * y1;
  }

  return sum / 2;
}

/**
 * Function areAdjacentEdges
 *
 * @description Whether edge `i` and edge `j` of an `n`-gon share an endpoint.
 * @access private
 * @since 1.0.0
 *
 * @param {number} i - The first edge's starting vertex index.
 * @param {number} j - The second edge's starting vertex index.
 * @param {number} vertexCount - The polygon's vertex count.
 *
 * @returns {boolean} `true` when the two edges are the same or adjacent.
 */
function areAdjacentEdges(i: number, j: number, vertexCount: number): boolean {
  if (i === j) {
    return true;
  }

  const difference: number = Math.abs(i - j);
  return difference === 1 || difference === vertexCount - 1;
}

/**
 * Function segmentsIntersect
 *
 * @description
 * Whether segment `a1→a2` properly crosses segment `b1→b2`, using the
 * orientation test. Segments that only touch at an endpoint are not
 * reported as crossing.
 *
 * @access private
 * @since 1.0.0
 *
 * @param {readonly [number, number]} a1 - The first segment's start.
 * @param {readonly [number, number]} a2 - The first segment's end.
 * @param {readonly [number, number]} b1 - The second segment's start.
 * @param {readonly [number, number]} b2 - The second segment's end.
 *
 * @returns {boolean} `true` when the two segments cross.
 */
function segmentsIntersect(
  a1: readonly [number, number],
  a2: readonly [number, number],
  b1: readonly [number, number],
  b2: readonly [number, number],
): boolean {
  const d1: number = cross(b1, b2, a1);
  const d2: number = cross(b1, b2, a2);
  const d3: number = cross(a1, a2, b1);
  const d4: number = cross(a1, a2, b2);

  const straddlesB: boolean =
    (d1 > COLLINEAR_EPSILON && d2 < -COLLINEAR_EPSILON) ||
    (d1 < -COLLINEAR_EPSILON && d2 > COLLINEAR_EPSILON);
  const straddlesA: boolean =
    (d3 > COLLINEAR_EPSILON && d4 < -COLLINEAR_EPSILON) ||
    (d3 < -COLLINEAR_EPSILON && d4 > COLLINEAR_EPSILON);

  return straddlesB && straddlesA;
}

/**
 * Function hasSelfIntersection
 *
 * @description
 * Whether any two non-adjacent edges of the polygon cross (a bow-tie
 * outline).
 *
 * @access private
 * @since 1.0.0
 *
 * @param {ReadonlyArray<readonly [number, number]>} points - The polygon's vertices, in order.
 *
 * @returns {boolean} `true` when a self-intersection was found.
 */
function hasSelfIntersection(points: ReadonlyArray<readonly [number, number]>): boolean {
  const vertexCount: number = points.length;

  for (let i = 0; i < vertexCount; i += 1) {
    for (let j = i + 1; j < vertexCount; j += 1) {
      if (areAdjacentEdges(i, j, vertexCount)) {
        continue;
      }

      const intersects: boolean = segmentsIntersect(
        points[i],
        points[(i + 1) % vertexCount],
        points[j],
        points[(j + 1) % vertexCount],
      );

      if (intersects) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Function normalizeWinding
 *
 * @description
 * Normalizes a polygon to a consistent (counter-clockwise, positive
 * shoelace area) winding order, reversing it when necessary.
 *
 * @access private
 * @since 1.0.0
 *
 * @param {ReadonlyArray<readonly [number, number]>} points - The polygon's vertices, in order.
 *
 * @returns {ReadonlyArray<readonly [number, number]>} The vertices in counter-clockwise order.
 */
function normalizeWinding(
  points: ReadonlyArray<readonly [number, number]>,
): ReadonlyArray<readonly [number, number]> {
  return signedArea(points) < 0 ? points.toReversed() : points;
}
