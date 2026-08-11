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
import { AreaChartModule, LegendPosition, LineChartModule, type Color } from '@swimlane/ngx-charts';
import { curveLinear, curveMonotoneX, type CurveFactory } from 'd3-shape';
import { THEME_PORT, type ThemePort } from '@core/theme';
import { EmptyState } from '@shared/empty-state';
import { HlmSkeleton } from '@shared/ui/skeleton';
import type { ChartSeries } from '../../../models';
import { resolveChartColorScheme, toNgxMultiSeries } from '../../../utils';

/**
 * Component LineChart
 * @class LineChart
 *
 * @description
 * A multi-series line or area chart over time — a thin typed wrapper over
 * ngx-charts so no caller touches `MultiSeries` or `ColorHelper` directly.
 * Generic by design: it names no domain and takes only `ChartSeries[]` plus
 * scalar display flags (`ARCHITECTURE.md` §6.4).
 *
 * SSR-safe: ngx-charts measures its host's `getBoundingClientRect()` and
 * subscribes a `ResizeObserver` in `ngAfterViewInit`, neither of which the
 * server platform provides, so the real element only mounts once
 * `isPlatformBrowser` is true. Until then — and while `loading` is set — a
 * `height`-sized skeleton holds the layout so hydration causes no shift.
 *
 * Colour is resolved from `core/theme`'s `resolvedTheme` signal rather than
 * read off the DOM (`utils/chart-color-scheme`), so a live appearance
 * switch recolors an already-rendered chart the same way the rest of the
 * shell does. The legend renders series names as text, so colour is never
 * the only way a series is told apart.
 *
 * @version 1.0.0
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
  imports: [AreaChartModule, LineChartModule, EmptyState, HlmSkeleton],
  providers: [provideIcons({ lucideChartLine })],
  host: { class: 'block' },
  templateUrl: './line-chart.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LineChart {
  //#region Constants
  /**
   * Property LEGEND_RESERVE_PX
   * @readonly
   * @static
   *
   * @description
   * Extra host height reserved for a below-plot legend — see
   * {@link totalHeight}. Sized for the single-row `horizontal-legend` this
   * component's one or two series always produce.
   *
   * @access private
   * @since 1.1.0
   *
   * @type {number}
   */
  private static readonly LEGEND_RESERVE_PX: number = 60;
  //#endregion

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
   * chart's `role="img"` wrapper since the rendered SVG is hidden from
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
   * The chart's height in pixels. Width fills the host.
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
   * Whether the line curves through its points (`curveMonotoneX`) instead of
   * connecting them with straight segments. Defaults to off: a straight
   * segment never implies a value between two real points that the data
   * does not contain.
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
   * Whether this instance runs on the browser platform. ngx-charts is
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
   * Whether ngx-charts may animate its transitions. ngx-charts defaults its
   * `animations` input to true and never consults `prefers-reduced-motion`
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
   * Property legendPosition
   * @readonly
   *
   * @description
   * Fixed legend placement below the plot — the layout that keeps a narrow,
   * tile-sized host from being squeezed by a side legend.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {LegendPosition}
   */
  protected readonly legendPosition: LegendPosition = LegendPosition.Below;

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
   * Property chartData
   * @readonly
   *
   * @description
   * The series mapped to ngx-charts' `MultiSeries` shape.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<ReturnType<typeof toNgxMultiSeries>>}
   */
  protected readonly chartData: Signal<ReturnType<typeof toNgxMultiSeries>> = computed(() =>
    toNgxMultiSeries(this.series()),
  );

  /**
   * Property curve
   * @readonly
   *
   * @description
   * The d3 curve factory backing {@link smooth}.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<CurveFactory>}
   */
  protected readonly curve: Signal<CurveFactory> = computed(() =>
    this.smooth() ? curveMonotoneX : curveLinear,
  );

  /**
   * Property colorScheme
   * @readonly
   *
   * @description
   * The ordinal palette for the currently resolved appearance, recomputed
   * whenever the app's theme changes.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<Color>}
   */
  protected readonly colorScheme: Signal<Color> = computed<Color>(() =>
    resolveChartColorScheme(this.themePort.resolvedTheme()),
  );

  /**
   * Property roundDomains
   * @readonly
   *
   * @description
   * Whether ngx-charts may round axis domains to nice ticks. Only safe when
   * the x values are `Date`s: with string labels ngx-charts builds a
   * `scalePoint`, which has no `.nice()`, and rounding would throw at render.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly roundDomains: Signal<boolean> = computed<boolean>(() =>
    this.series().some((entry) => entry.points.some((point) => point.label instanceof Date)),
  );

  /**
   * Property totalHeight
   * @readonly
   *
   * @description
   * The pixel height reserved for the host: {@link height} plus, when the
   * legend renders, {@link LEGEND_RESERVE_PX}. ngx-charts only subtracts
   * legend space from its own layout for a *side* legend (`LegendPosition.Right`
   * / `Left`); for `LegendPosition.Below` — this component's fixed choice —
   * it measures the host at the full `height()` for the plot alone and
   * renders the legend as extra content past it, which `hlmCard`'s
   * `overflow-hidden` then clips unless the host reserves the room itself.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {Signal<number>}
   */
  protected readonly totalHeight: Signal<number> = computed<number>(
    () => this.height() + (this.showLegend() ? LineChart.LEGEND_RESERVE_PX : 0),
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
