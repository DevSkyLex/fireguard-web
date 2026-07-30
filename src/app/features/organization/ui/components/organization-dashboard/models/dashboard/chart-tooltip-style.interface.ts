import type { ChartTooltipFont } from './chart-tooltip-font.interface';

/**
 * Interface ChartTooltipStyle
 *
 * @description
 * App-styled presentation options for a Chart.js tooltip, spread into a
 * chart's `plugins.tooltip` options. Styling only — callers keep their own
 * `callbacks` for title/label formatting.
 *
 * @since 1.0.0
 */
export interface ChartTooltipStyle {
  /** Tooltip surface colour. */
  readonly backgroundColor: string;

  /** Title text colour. */
  readonly titleColor: string;

  /** Body text colour. */
  readonly bodyColor: string;

  /** Hairline border colour. */
  readonly borderColor: string;

  /** Border width in pixels. */
  readonly borderWidth: number;

  /** Inner padding in pixels. */
  readonly padding: number;

  /** Corner radius in pixels. */
  readonly cornerRadius: number;

  /** Caret size in pixels. */
  readonly caretSize: number;

  /** Whether series colour markers are shown. */
  readonly displayColors: boolean;

  /** Whether markers use the point style (circular). */
  readonly usePointStyle: boolean;

  /** Padding around the colour markers in pixels. */
  readonly boxPadding: number;

  /** Space below the title in pixels. */
  readonly titleMarginBottom: number;

  /** Title font settings. */
  readonly titleFont: ChartTooltipFont;

  /** Body font settings. */
  readonly bodyFont: ChartTooltipFont;
}
