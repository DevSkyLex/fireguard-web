import type { PlanPoint } from '@shared/plan-viewer';

/**
 * Function normalizedPointToPixel
 *
 * @description
 * Converts a point in normalized 0–1 image coordinates (the wire format the
 * plan-overlay endpoint returns) to image-pixel coordinates, the space the
 * plan viewer's transformed stage — and this overlay — both render in.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {PlanPoint} point - A normalized point, each axis in `[0, 1]`.
 * @param {number} imageWidth - The plan image's natural pixel width.
 * @param {number} imageHeight - The plan image's natural pixel height.
 *
 * @returns {PlanPoint} The point in image-pixel coordinates.
 */
export function normalizedPointToPixel(
  point: PlanPoint,
  imageWidth: number,
  imageHeight: number,
): PlanPoint {
  return { x: point.x * imageWidth, y: point.y * imageHeight };
}
