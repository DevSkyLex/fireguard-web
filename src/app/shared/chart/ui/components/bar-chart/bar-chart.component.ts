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
import { lucideChartColumn } from '@ng-icons/lucide';
import { BarChartModule, LegendPosition, type Color } from '@swimlane/ngx-charts';
import { THEME_PORT, type ThemePort } from '@core/theme';
import { EmptyState } from '@shared/empty-state';
import { HlmSkeleton } from '@shared/ui/skeleton';
import type { ChartSeries } from '../../../models';
import { resolveChartColorScheme, toNgxMultiSeries, toNgxSingleSeries } from '../../../utils';

/**
 * Component BarChart
 * @class BarChart
 *
 * @description
 * Vertical bars over a set of categories — a thin typed wrapper over
 * ngx-charts so no caller touches `SingleSeries` / `MultiSeries` directly.
 * One series renders as a plain bar-per-category chart; more than one
 * renders as grouped bars, one group per category. Generic by design: it
 * names no domain and takes only `ChartSeries[]` plus scalar display flags
 * (`ARCHITECTURE.md` §6.4).
 *
 * SSR-safe and themed the same way as `line-chart` (see its `@description`
 * for the `isPlatformBrowser` guard and the `resolvedTheme`-driven colour
 * scheme) — both reasons live there rather than being restated here.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-bar-chart [series]="byStatus()" label="Interventions by status" />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-bar-chart',
  imports: [BarChartModule, EmptyState, HlmSkeleton],
  providers: [provideIcons({ lucideChartColumn })],
  host: { class: 'block' },
  templateUrl: './bar-chart.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BarChart {
  //#region Constants
  /**
   * Property LEGEND_RESERVE_PX
   * @readonly
   * @static
   *
   * @description
   * Extra host height reserved for a below-plot legend — see
   * {@link totalHeight}. Sized for the single-row `horizontal-legend` this
   * component's few series always produce.
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
   * The series to plot. One entry renders single bars, one per point; more
   * than one renders grouped bars, one group per point position.
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
   * Whether the series-name legend renders. Only meaningful once a second
   * series turns the chart into grouped bars.
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
   * Whether ngx-charts may animate its transitions — same
   * `prefers-reduced-motion` guard as `line-chart`'s `animationsEnabled`.
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
   * Property isGrouped
   * @readonly
   *
   * @description
   * Whether more than one series was given, switching the renderer from
   * plain bars to grouped bars.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly isGrouped: Signal<boolean> = computed<boolean>(() => this.series().length > 1);

  /**
   * Property groupedData
   * @readonly
   *
   * @description
   * The series mapped to ngx-charts' `MultiSeries` shape, for the grouped renderer.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<ReturnType<typeof toNgxMultiSeries>>}
   */
  protected readonly groupedData: Signal<ReturnType<typeof toNgxMultiSeries>> = computed(() =>
    toNgxMultiSeries(this.series()),
  );

  /**
   * Property singleData
   * @readonly
   *
   * @description
   * The first series' points mapped to ngx-charts' `SingleSeries` shape, for
   * the plain-bars renderer.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<ReturnType<typeof toNgxSingleSeries>>}
   */
  protected readonly singleData: Signal<ReturnType<typeof toNgxSingleSeries>> = computed(() =>
    toNgxSingleSeries(this.series()[0] ?? { name: '', points: [] }),
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
   * Property totalHeight
   * @readonly
   *
   * @description
   * The pixel height reserved for the host: {@link height} plus, when the
   * legend renders, {@link LEGEND_RESERVE_PX} — same clipping workaround as
   * `line-chart`'s `totalHeight`: ngx-charts renders a `LegendPosition.Below`
   * legend past the measured plot height instead of inside it.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {Signal<number>}
   */
  protected readonly totalHeight: Signal<number> = computed<number>(
    () => this.height() + (this.showLegend() ? BarChart.LEGEND_RESERVE_PX : 0),
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
  protected readonly emptyTitle: string = $localize`:@@shared.chart.barChart.empty.title:No data`;
  //#endregion
}
