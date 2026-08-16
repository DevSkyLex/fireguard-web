import type {
  PlanPoint,
  PlanTransform,
  PlanViewportSize,
} from '../../models/plan-transform.interface';

/**
 * Function clampPlanZoom
 *
 * @description Confines a scale factor to the viewer's configured zoom range.
 *
 * @param {number} scale - The candidate scale.
 * @param {number} minZoom - The lowest allowed scale.
 * @param {number} maxZoom - The highest allowed scale.
 *
 * @returns {number} The scale, confined to `[minZoom, maxZoom]`.
 *
 * @since 1.0.0
 */
export function clampPlanZoom(scale: number, minZoom: number, maxZoom: number): number {
  return Math.min(Math.max(scale, minZoom), maxZoom);
}

/**
 * Function zoomPlanAtPoint
 *
 * @description
 * Applies a multiplicative zoom `factor` around a `pointer` position so the
 * content point currently under the pointer stays under it — the invariant a
 * cursor-centered or pinch zoom must hold. The pointer and the transform's
 * `x`/`y` share the same origin: the viewport's center, since the stage is
 * centered by layout before the transform is applied. The result's scale is
 * clamped to `[minZoom, maxZoom]` first, and the translation is derived from
 * the resulting *effective* factor, so clamping never breaks the invariant.
 *
 * @param {PlanTransform} transform - The transform before this zoom step.
 * @param {PlanPoint} pointer - The zoom's anchor, viewport-relative.
 * @param {PlanViewportSize} viewport - The viewport's current size.
 * @param {number} factor - The requested multiplicative zoom change.
 * @param {number} minZoom - The lowest allowed scale.
 * @param {number} maxZoom - The highest allowed scale.
 *
 * @returns {PlanTransform} The zoomed transform, pan not yet clamped.
 *
 * @since 1.0.0
 */
export function zoomPlanAtPoint(
  transform: PlanTransform,
  pointer: PlanPoint,
  viewport: PlanViewportSize,
  factor: number,
  minZoom: number,
  maxZoom: number,
): PlanTransform {
  const nextScale: number = clampPlanZoom(transform.scale * factor, minZoom, maxZoom);
  const effectiveFactor: number = nextScale / transform.scale;

  const centeredX: number = pointer.x - viewport.width / 2;
  const centeredY: number = pointer.y - viewport.height / 2;

  return {
    x: centeredX - effectiveFactor * (centeredX - transform.x),
    y: centeredY - effectiveFactor * (centeredY - transform.y),
    scale: nextScale,
  };
}

/**
 * Function clampPlanPan
 *
 * @description
 * Confines a transform's translation so the scaled content can never leave
 * the viewport entirely — at least `minVisiblePx` of it stays reachable on
 * every edge. When the scaled content is small enough that no legal range
 * remains (it comfortably fits with room to spare), the pan collapses to
 * zero rather than leaving it stuck off-center.
 *
 * @param {PlanTransform} transform - The transform to confine.
 * @param {PlanViewportSize} viewport - The viewport's current size.
 * @param {PlanViewportSize} content - The content's natural, unscaled size.
 * @param {number} minVisiblePx - The minimum sliver of content kept on screen.
 *
 * @returns {PlanTransform} The same scale, with `x`/`y` confined.
 *
 * @since 1.0.0
 */
export function clampPlanPan(
  transform: PlanTransform,
  viewport: PlanViewportSize,
  content: PlanViewportSize,
  minVisiblePx: number,
): PlanTransform {
  return {
    ...transform,
    x: clampPanAxis(transform.x, viewport.width, content.width * transform.scale, minVisiblePx),
    y: clampPanAxis(transform.y, viewport.height, content.height * transform.scale, minVisiblePx),
  };
}

/**
 * Function planPointerDistance
 *
 * @description The straight-line distance between two pointers, for pinch-zoom.
 *
 * @param {PlanPoint} first - The first pointer.
 * @param {PlanPoint} second - The second pointer.
 *
 * @returns {number} The distance in pixels.
 *
 * @since 1.0.0
 */
export function planPointerDistance(first: PlanPoint, second: PlanPoint): number {
  return Math.hypot(second.x - first.x, second.y - first.y);
}

/**
 * Function planPointerMidpoint
 *
 * @description The midpoint between two pointers, used as the pinch-zoom anchor.
 *
 * @param {PlanPoint} first - The first pointer.
 * @param {PlanPoint} second - The second pointer.
 *
 * @returns {PlanPoint} The midpoint.
 *
 * @since 1.0.0
 */
export function planPointerMidpoint(first: PlanPoint, second: PlanPoint): PlanPoint {
  return { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
}

/**
 * Function clampPanAxis
 *
 * @description
 * The single-axis half of {@link clampPlanPan} — confines one translation
 * component so at least `minVisiblePx` of the scaled content stays within
 * `[0, viewportSize]` on that axis.
 *
 * @access private
 *
 * @param {number} value - The candidate translation on this axis.
 * @param {number} viewportSize - The viewport's size on this axis.
 * @param {number} scaledContentSize - The content's scaled size on this axis.
 * @param {number} minVisiblePx - The minimum sliver of content kept on screen.
 *
 * @returns {number} The confined translation.
 *
 * @since 1.0.0
 */
function clampPanAxis(
  value: number,
  viewportSize: number,
  scaledContentSize: number,
  minVisiblePx: number,
): number {
  const halfViewport: number = viewportSize / 2;
  const halfContent: number = scaledContentSize / 2;

  const min: number = minVisiblePx - halfViewport - halfContent;
  const max: number = halfViewport - minVisiblePx + halfContent;

  return min > max ? 0 : Math.min(Math.max(value, min), max);
}
