import type { PlanPoint } from '@shared/plan-viewer';

/**
 * Function polygonCentroid
 *
 * @description
 * The area-weighted centroid of a simple polygon, used to place a zone's
 * name label. Falls back to the arithmetic mean of the vertices for a
 * degenerate (zero-area) polygon — a single point or a set of collinear
 * points — where the area-weighted formula divides by zero.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {ReadonlyArray<PlanPoint>} points - The polygon's vertices, in order.
 *
 * @returns {PlanPoint} The centroid, or the origin for an empty polygon.
 */
export function polygonCentroid(points: ReadonlyArray<PlanPoint>): PlanPoint {
  if (points.length === 0) return { x: 0, y: 0 };
  if (points.length === 1) return points[0];

  let signedArea = 0;
  let centroidX = 0;
  let centroidY = 0;

  for (let index = 0; index < points.length; index += 1) {
    const current: PlanPoint = points[index];
    const next: PlanPoint = points[(index + 1) % points.length];
    const cross: number = current.x * next.y - next.x * current.y;

    signedArea += cross;
    centroidX += (current.x + next.x) * cross;
    centroidY += (current.y + next.y) * cross;
  }

  if (signedArea === 0) {
    const sum: PlanPoint = points.reduce(
      (accumulator, point) => ({ x: accumulator.x + point.x, y: accumulator.y + point.y }),
      { x: 0, y: 0 },
    );

    return { x: sum.x / points.length, y: sum.y / points.length };
  }

  const sixTimesArea: number = signedArea * 3;

  return { x: centroidX / sixTimesArea, y: centroidY / sixTimesArea };
}
