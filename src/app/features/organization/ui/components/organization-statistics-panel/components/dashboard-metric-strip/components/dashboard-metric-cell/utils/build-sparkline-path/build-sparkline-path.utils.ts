/**
 * Constant SPARKLINE_VIEWBOX_WIDTH
 *
 * @description
 * Logical width of the sparkline viewBox, matching the dashboard
 * design kit (`viewBox="0 0 120 26"`).
 *
 * @since 1.0.0
 *
 * @type {number}
 */
export const SPARKLINE_VIEWBOX_WIDTH: number = 120;

/**
 * Constant SPARKLINE_VIEWBOX_HEIGHT
 *
 * @description
 * Logical height of the sparkline viewBox, matching the dashboard
 * design kit (`viewBox="0 0 120 26"`).
 *
 * @since 1.0.0
 *
 * @type {number}
 */
export const SPARKLINE_VIEWBOX_HEIGHT: number = 26;

/**
 * Function buildSparklinePath
 *
 * @description
 * Builds the SVG path (`M x,y L x,y …`) of a straight-segment sparkline
 * from ordered numeric points, normalized to the 120×26 viewBox with a
 * small vertical inset so the non-scaling stroke never clips. A flat
 * series renders as a centered horizontal line.
 *
 * @param {readonly number[]} points - Ordered series values (at least two).
 * @returns {string | null} The SVG path definition, or null when fewer than two points.
 */
export function buildSparklinePath(points: readonly number[]): string | null {
  if (points.length < 2) return null;

  const inset: number = 2;
  const innerHeight: number = SPARKLINE_VIEWBOX_HEIGHT - inset * 2;
  const stepX: number = SPARKLINE_VIEWBOX_WIDTH / (points.length - 1);
  const min: number = Math.min(...points);
  const span: number = Math.max(...points) - min;

  const coordinates: string[] = points.map((value: number, index: number): string => {
    const ratio: number = span === 0 ? 0.5 : (value - min) / span;
    const x: number = Math.round(index * stepX * 100) / 100;
    const y: number = Math.round((inset + (1 - ratio) * innerHeight) * 100) / 100;
    return `${x},${y}`;
  });

  return `M${coordinates[0]} L${coordinates.slice(1).join(' L')}`;
}
