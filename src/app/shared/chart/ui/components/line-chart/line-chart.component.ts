import type { BooleanInput } from '@angular/cdk/coercion';
import { isPlatformBrowser } from '@angular/common';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  PLATFORM_ID,
  type InputSignal,
  type InputSignalWithTransform,
  type Signal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChartLine } from '@ng-icons/lucide';
import type { ChartOptions } from '@tanstack/angular-charts';
import { areaY, colorLegend, defineChart, lineY } from '@tanstack/charts';
import { scaleLinear } from '@tanstack/charts/scales/linear';
import { scalePoint } from '@tanstack/charts/scales/point';
import { HLM_CHART_THEME, HlmChartImports, hlmChartTooltip } from '@shared/ui/chart';
import { HlmEmptyImports } from '@shared/ui/empty';
import { HlmSkeleton } from '@shared/ui/skeleton';
import type { ChartSeries } from '../../../models';

/**
 * Type LineChartDatum
 * @type
 * @description One named series value at a shared category; missing samples remain gaps.
 * @since 3.0.0
 */
type LineChartDatum = {
  readonly category: string;
  readonly value: number | null;
  readonly series: string;
};

/**
 * Component LineChart
 * @class LineChart
 *
 * @description
 * Maps the application's generic time series to the official Spartan Chart primitive.
 * Native SVG rendering, legend, focus and tooltip use Spartan's semantic theme tokens.
 * Loading and server rendering reserve the plot height; empty data gets an explicit state.
 *
 * @version 3.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-line-chart',
  imports: [NgIcon, ...HlmEmptyImports, HlmChartImports, HlmSkeleton],
  providers: [provideIcons({ lucideChartLine })],
  host: { class: 'block min-w-0' },
  templateUrl: './line-chart.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LineChart {
  //#region Inputs
  /**
   * Property series
   * @readonly
   *
   * @description
   * The named series to plot. One line/area per entry.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly ChartSeries[]>}
   */
  public readonly series: InputSignal<readonly ChartSeries[]> =
    input.required<readonly ChartSeries[]>();

  /**
   * Property label
   * @readonly
   *
   * @description
   * The accessible name passed to Spartan's native chart surface.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly label: InputSignal<string> = input.required<string>();

  /**
   * Property height
   * @readonly
   *
   * @description
   * Fixed plot height; the native chart measures its available width.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<number>}
   */
  public readonly height: InputSignal<number> = input<number>(320);

  /**
   * Property showLegend
   * @readonly
   *
   * @description
   * Whether the series-name legend renders.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignalWithTransform<boolean, BooleanInput>}
   */
  public readonly showLegend: InputSignalWithTransform<boolean, BooleanInput> = input<
    boolean,
    BooleanInput
  >(true, { transform: booleanAttribute });

  /**
   * Property area
   * @readonly
   *
   * @description
   * Renders a filled area under each line instead of a bare stroke.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignalWithTransform<boolean, BooleanInput>}
   */
  public readonly area: InputSignalWithTransform<boolean, BooleanInput> = input<
    boolean,
    BooleanInput
  >(false, { transform: booleanAttribute });

  /**
   * Property showGridLines
   * @readonly
   *
   * @description
   * Whether the native value axis shows horizontal gridlines.
   *
   * @access public
   * @since 1.2.0
   *
   * @type {InputSignalWithTransform<boolean, BooleanInput>}
   */
  public readonly showGridLines: InputSignalWithTransform<boolean, BooleanInput> = input<
    boolean,
    BooleanInput
  >(true, { transform: booleanAttribute });

  /**
   * Property loading
   * @readonly
   *
   * @description
   * Shows the height-sized skeleton in place of the chart while data is
   * still in flight.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignalWithTransform<boolean, BooleanInput>}
   */
  public readonly loading: InputSignalWithTransform<boolean, BooleanInput> = input<
    boolean,
    BooleanInput
  >(false, { transform: booleanAttribute });

  /**
   * Property isBrowser
   * @readonly
   *
   * @description
   * Whether this instance runs on the browser platform. The chart is
   * mounted only when true; the server render shows the skeleton instead.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {boolean}
   */
  protected readonly isBrowser: boolean = isPlatformBrowser(inject(PLATFORM_ID));

  /**
   * Property isEmpty
   * @readonly
   *
   * @description
   * True when no series carries a single point.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly isEmpty: Signal<boolean> = computed<boolean>(
    () => !this.series().some((entry) => entry.points.length > 0),
  );

  /**
   * Property emptyTitle
   * @readonly
   *
   * @description
   * Heading shown by the empty state when no series carries a point.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {string}
   */
  protected readonly emptyTitle: string = $localize`:@@shared.chart.lineChart.empty.title:No data`;
  /**
   * Property chartOptions
   * @readonly
   * @description Aligns categories across series and configures the native Spartan plot.
   * Missing samples are null rather than fabricated zeroes. Semantic CSS variables keep
   * the plot and its tooltip synchronized with the current theme without DOM reads.
   * @access protected
   * @since 3.0.0
   * @type {Signal<ChartOptions<LineChartDatum, string, number>>}
   */
  protected readonly chartOptions: Signal<ChartOptions<LineChartDatum, string, number>> = computed(
    () => {
      const normalized = this.series().map((series) => ({
        name: series.name,
        points: series.points.map((point) => ({
          category:
            point.label instanceof Date ? point.label.toISOString().slice(0, 10) : point.label,
          value: Number.isFinite(point.value) ? point.value : null,
        })),
      }));
      const categories = [
        ...new Set(normalized.flatMap((series) => series.points.map((point) => point.category))),
      ];
      const rows: LineChartDatum[] = normalized.flatMap((series) => {
        const values = new Map(series.points.map((point) => [point.category, point.value]));
        return categories.map((category) => ({
          category,
          value: values.get(category) ?? null,
          series: series.name,
        }));
      });
      const channels = { x: 'category', y: 'value', z: 'series', color: 'series' } as const;
      return {
        definition: defineChart(
          {
            marks: [
              ...(this.area() ? [areaY(rows, { ...channels, fillOpacity: 0.12 })] : []),
              lineY(rows, { ...channels, strokeWidth: 2, points: true }),
            ],
            scales: {
              x: { scale: scalePoint<string>().domain(categories).padding(0.3) },
              y: {
                scale: scaleLinear().domain([
                  Math.min(0, ...rows.map((row) => row.value ?? 0)),
                  Math.max(1, ...rows.map((row) => row.value ?? 0)),
                ]),
                nice: true,
                grid: this.showGridLines(),
              },
            },
            color: {
              domain: normalized.map((series) => series.name),
              range: HLM_CHART_THEME.palette,
              ...(this.showLegend() ? { legend: colorLegend({ placement: 'bottom' }) } : {}),
            },
            theme: HLM_CHART_THEME,
          },
          {
            focus: 'nearest-x',
            tooltip: hlmChartTooltip<LineChartDatum, string, number>({
              content: (points) => ({
                title: points[0]?.xValue,
                rows: [...new Map(points.map((point) => [point.datum.series, point])).values()].map(
                  (point) => ({
                    label: point.datum.series,
                    value: String(point.yValue),
                    color: point.color,
                  }),
                ),
              }),
            }),
          },
        ),
        ariaLabel: this.label(),
        height: this.height(),
      };
    },
  );
}
