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
import { provideIcons } from '@ng-icons/core';
import { lucideChartLine } from '@ng-icons/lucide';
import type { ChartData, ChartOptions } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { THEME_PORT, type ThemePort } from '@core/theme';
import { EmptyState } from '@shared/empty-state';
import { HlmSkeleton } from '@shared/ui/skeleton';
import type { ChartSeries } from '../../../models';
import { resolveChartColorScheme, resolveChartGridColors, toChartJsLineData } from '../../../utils';

/**
 * Component LineChart
 * @class LineChart
 *
 * @description
 * A multi-series line or area chart over time — a thin typed wrapper over
 * Chart.js (through `ng2-charts`' `BaseChartDirective`) so no caller touches
 * `ChartData`/`ChartOptions` directly. Generic by design: it names no domain
 * and takes only `ChartSeries[]` plus scalar display flags (`ARCHITECTURE.md`
 * §6.4). Replaces the retired `@swimlane/ngx-charts` wrapper of the same name
 * (`organization/FEATURE.md` § Dashboard) — Chart.js takes gridline colour,
 * tick typography and tooltip chrome as first-class options instead of
 * ngx-charts' unreachable internal SVG classes, which is what motivated the
 * move.
 *
 * SSR-safe: a canvas element only mounts once `isPlatformBrowser` is true —
 * `ng2-charts` itself guards its browser-only work the same way, but a
 * height-sized skeleton is still rendered up front here so hydration causes
 * no layout shift. Until then — and while `loading` is set — that skeleton
 * holds the layout.
 *
 * Colour is resolved from `core/theme`'s `resolvedTheme` signal rather than
 * read off the DOM (`utils/chart-color-scheme`, `utils/chart-grid-colors`),
 * so a live appearance switch recolors an already-rendered chart the same
 * way the rest of the shell does — both the dataset palette and the
 * gridline/tick/tooltip chrome are computed signals over that same source,
 * and Chart.js is handed a fresh `data`/`options` object on every change, so
 * `BaseChartDirective` redraws in place. The legend renders series names as
 * compact centred pills with small circular swatches below the plot, so
 * colour is never the only way a series is told apart. Points stay hidden
 * at rest and reveal on hover with an enlarged hit radius, gridlines draw
 * on the horizontal axis only, and the tooltip is a themed rounded card
 * rather than Chart.js' default black box.
 *
 * @version 2.1.0
 *
 * @example
 * ```html
 * <app-line-chart [series]="trend()" [label]="'Inspections over time'" area smooth />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-line-chart',
  imports: [BaseChartDirective, EmptyState, HlmSkeleton],
  providers: [provideIcons({ lucideChartLine })],
  host: { class: 'block' },
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
   * The chart's accessible name — what it plots, in one sentence. Set on the
   * chart's `role="img"` wrapper since the rendered canvas is hidden from
   * assistive tech (`aria-hidden`) as too fine-grained to navigate usefully.
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
   * The chart's height in pixels. Width fills the host. Unlike the retired
   * ngx-charts wrapper, Chart.js' built-in legend draws inside this box
   * (shrinking the plot area to fit) rather than past it, so no extra
   * height needs reserving for it.
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
   * Property smooth
   * @readonly
   *
   * @description
   * Whether the line curves through its points instead of connecting them
   * with straight segments. Defaults to off: a straight segment never
   * implies a value between two real points that the data does not contain.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignalWithTransform<boolean, BooleanInput>}
   */
  public readonly smooth: InputSignalWithTransform<boolean, BooleanInput> = input<
    boolean,
    BooleanInput
  >(false, { transform: booleanAttribute });

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
   * Property gradient
   * @readonly
   *
   * @description
   * Fades an {@link area} fill from its series colour to transparent instead
   * of a flat tint, through a Chart.js scriptable `backgroundColor` reading
   * the canvas' own gradient API (`utils/chart-series-mapper`). Has no
   * effect without {@link area}. Defaults on.
   *
   * @access public
   * @since 1.2.0
   *
   * @type {InputSignalWithTransform<boolean, BooleanInput>}
   */
  public readonly gradient: InputSignalWithTransform<boolean, BooleanInput> = input<
    boolean,
    BooleanInput
  >(true, { transform: booleanAttribute });

  /**
   * Property showGridLines
   * @readonly
   *
   * @description
   * Whether Chart.js draws the horizontal (y-axis) gridlines. The vertical
   * gridlines are always off — a full cage reads as dated, and the x-axis
   * ticks already mark each category. Defaults on for legibility; a caller
   * plotting a single, self-explanatory series may turn it off for a
   * quieter card.
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
  //#endregion

  //#region Properties
  /**
   * Property themePort
   * @readonly
   *
   * @description
   * The app-wide appearance contract, read for its already-resolved
   * `'light' | 'dark'` value.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {ThemePort}
   */
  private readonly themePort: ThemePort = inject<ThemePort>(THEME_PORT);

  /**
   * Property isBrowser
   * @readonly
   *
   * @description
   * Whether this instance runs on the browser platform. The canvas is
   * mounted only when true; the server render shows the skeleton instead.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {boolean}
   */
  protected readonly isBrowser: boolean = isPlatformBrowser(inject(PLATFORM_ID));

  /**
   * Property animationsEnabled
   * @readonly
   *
   * @description
   * Whether Chart.js may animate its transitions. Chart.js defaults its
   * `animation` option to on and never consults `prefers-reduced-motion`
   * itself, so the wrapper reads the media query once (browser only) and
   * disables the transitions for users who asked for reduced motion.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {boolean}
   */
  protected readonly animationsEnabled: boolean =
    this.isBrowser &&
    !(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);

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
   * Property colorScheme
   * @readonly
   *
   * @description
   * The ordinal dataset palette for the currently resolved appearance,
   * recomputed whenever the app's theme changes.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly string[]>}
   */
  protected readonly colorScheme: Signal<readonly string[]> = computed<readonly string[]>(() =>
    resolveChartColorScheme(this.themePort.resolvedTheme()),
  );

  /**
   * Property gridColors
   * @readonly
   *
   * @description
   * The resolved gridline/tick/tooltip chrome colours for the currently
   * resolved appearance, recomputed whenever the app's theme changes.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<ReturnType<typeof resolveChartGridColors>>}
   */
  protected readonly gridColors: Signal<ReturnType<typeof resolveChartGridColors>> = computed(() =>
    resolveChartGridColors(this.themePort.resolvedTheme()),
  );

  /**
   * Property chartData
   * @readonly
   *
   * @description
   * The series mapped to Chart.js' `ChartData<'line'>` shape.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<ChartData<'line'>>}
   */
  protected readonly chartData: Signal<ChartData<'line'>> = computed<ChartData<'line'>>(() =>
    toChartJsLineData(this.series(), this.colorScheme(), this.area(), this.gradient()),
  );

  /**
   * Property chartOptions
   * @readonly
   *
   * @description
   * The Chart.js options for this instance's current display flags and the
   * resolved theme's chrome colours — grid lines, tick colour, legend and
   * tooltip styling all live here instead of an unreachable stylesheet
   * selector, which is the capability the move off ngx-charts was for
   * (`organization/FEATURE.md` § Dashboard).
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<ChartOptions<'line'>>}
   */
  protected readonly chartOptions: Signal<ChartOptions<'line'>> = computed<ChartOptions<'line'>>(
    () => {
      const grid = this.gridColors();

      return {
        responsive: true,
        maintainAspectRatio: false,
        animation: this.animationsEnabled ? { duration: 700, easing: 'easeOutQuart' } : false,
        animations: { radius: { duration: 0 } },
        interaction: { mode: 'index', intersect: false },
        elements: {
          line: { tension: this.smooth() ? 0.35 : 0, capBezierPoints: true },
          point: { hoverBorderWidth: 2 },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: grid.tick, padding: 8, maxRotation: 0 },
            border: { color: grid.border },
          },
          y: {
            beginAtZero: true,
            grid: { display: this.showGridLines(), color: grid.border, drawTicks: false },
            ticks: { color: grid.tick, padding: 8, maxTicksLimit: 6 },
            border: { display: false },
          },
        },
        plugins: {
          legend: {
            display: this.showLegend(),
            position: 'bottom',
            align: 'center',
            labels: {
              color: grid.tick,
              usePointStyle: true,
              pointStyle: 'circle',
              boxWidth: 6,
              boxHeight: 6,
              padding: 16,
              font: { size: 12, weight: 500 },
            },
          },
          tooltip: {
            backgroundColor: grid.tooltipBackground,
            titleColor: grid.tooltipForeground,
            bodyColor: grid.tooltipForeground,
            borderColor: grid.border,
            borderWidth: 1,
            padding: 10,
            cornerRadius: 10,
            boxPadding: 6,
            usePointStyle: true,
            titleFont: { weight: 600 },
            titleMarginBottom: 6,
          },
        },
      };
    },
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
  //#endregion
}
