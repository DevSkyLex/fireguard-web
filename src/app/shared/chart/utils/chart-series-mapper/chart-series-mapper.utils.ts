import type { ChartData, ScriptableContext } from 'chart.js';
import type { ChartPoint, ChartSeries } from '../../models';

/**
 * Function formatChartPointLabel
 * @description Renders one {@link ChartPoint}'s category as the plain string Chart.js' category scale takes — every current caller already hands aligned string buckets, but a `Date` label (the type's other allowed shape) still formats sensibly rather than stringifying to `[object Date]`.
 * @access private
 * @param {ChartPoint['label']} label - The point's category.
 * @returns {string} The formatted label.
 */
function formatChartPointLabel(label: ChartPoint['label']): string {
  return label instanceof Date
    ? label.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
    : label;
}

/**
 * Function withOklchAlpha
 * @description Rewrites a resolved `oklch(L C H)` literal (or one that already carries an alpha channel) to a given alpha — `chart-color-scheme.utils.ts`' palette entries carry no alpha of their own, since a series' plain stroke colour is always fully opaque.
 * @access private
 * @param {string} color - An `oklch(...)` colour literal.
 * @param {number} alpha - The alpha channel, `0`–`1`.
 * @returns {string} The same colour with the given alpha.
 */
function withOklchAlpha(color: string, alpha: number): string {
  const withoutAlpha = color.replace(/\s*\/\s*[\d.]+%?\s*\)$/, ')');

  return withoutAlpha.replace(/\)$/, ` / ${alpha})`);
}

/**
 * Function buildAreaFill
 * @description A Chart.js scriptable `backgroundColor` fading a line's {@link withOklchAlpha} tint to transparent down the plot — the gradient chrome the retired `shared/chart` ngx-charts wrapper could only reach through an `[gradient]` boolean input, now a first-class canvas-context callback (`organization/FEATURE.md` § Dashboard). Falls back to a flat translucent tint before the chart area is laid out (the callback's first invocation).
 * @access private
 * @param {string} color - The series' resolved stroke colour.
 * @returns {(context: ScriptableContext<'line'>) => CanvasGradient | string} The scriptable fill.
 */
function buildAreaFill(
  color: string,
): (context: ScriptableContext<'line'>) => CanvasGradient | string {
  return (context: ScriptableContext<'line'>): CanvasGradient | string => {
    const { chartArea, ctx } = context.chart;

    if (!chartArea) return withOklchAlpha(color, 0.18);

    const fill = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);

    fill.addColorStop(0, withOklchAlpha(color, 0.4));
    fill.addColorStop(0.6, withOklchAlpha(color, 0.12));
    fill.addColorStop(1, withOklchAlpha(color, 0));

    return fill;
  };
}

/**
 * Function toChartJsLineData
 *
 * @description
 * Maps the app's {@link ChartSeries} shape to Chart.js' `ChartData<'line'>` —
 * the format `line-chart` feeds `ng2-charts`' `BaseChartDirective` — so a
 * caller never builds a Chart.js dataset itself. Every series shares one
 * label axis, read from the first series: every current caller (the
 * dashboard trend charts) already aligns all its series to one common
 * bucket axis before calling this (`alignDashboardTrendSeries`).
 *
 * @param {readonly ChartSeries[]} series - The series to convert.
 * @param {readonly string[]} palette - The resolved, theme-appropriate series colours, in series order.
 * @param {boolean} area - Whether each line fills to the axis.
 * @param {boolean} gradient - Whether an {@link area} fill fades to transparent instead of a flat tint.
 *
 * @returns {ChartData<'line'>} The equivalent Chart.js line chart data.
 *
 * @since 2.0.0
 */
export function toChartJsLineData(
  series: readonly ChartSeries[],
  palette: readonly string[],
  area: boolean,
  gradient: boolean,
): ChartData<'line'> {
  const labels: string[] = (series[0]?.points ?? []).map((point) =>
    formatChartPointLabel(point.label),
  );

  return {
    labels,
    datasets: series.map((entry, index) => {
      const color: string = palette[index % palette.length] ?? palette[0] ?? 'oklch(0.5 0 0)';

      return {
        label: entry.name,
        data: entry.points.map((point) => point.value),
        borderColor: color,
        backgroundColor: area
          ? gradient
            ? buildAreaFill(color)
            : withOklchAlpha(color, 0.18)
          : color,
        pointBackgroundColor: color,
        pointBorderColor: color,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHitRadius: 12,
        pointHoverBorderWidth: 2,
        borderWidth: 2.5,
        borderCapStyle: 'round',
        borderJoinStyle: 'round',
        fill: area,
      };
    }),
  };
}
