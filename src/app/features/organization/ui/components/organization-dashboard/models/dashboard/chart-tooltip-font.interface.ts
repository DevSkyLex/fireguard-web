/**
 * Interface ChartTooltipFont
 *
 * @description
 * Font settings applied to a canvas-drawn Chart.js tooltip section. Structural
 * subset of Chart.js `FontSpec`, kept local so chart components stay typed
 * without depending on Chart.js internals here.
 *
 * @since 1.0.0
 */
export interface ChartTooltipFont {
  /** Font family stack passed to the canvas renderer. */
  readonly family: string;

  /** Font size in pixels. */
  readonly size: number;

  /** Numeric font weight. */
  readonly weight: number;
}
