import { isPlatformBrowser, DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  PLATFORM_ID,
  LOCALE_ID,
  type InputSignal,
  type Signal,
} from '@angular/core';
import type { ChartOptions } from '@tanstack/angular-charts';
import { defineChart } from '@tanstack/charts';
import { pie, polar, radialArc, type PieDatum } from '@tanstack/charts/polar';
import { HLM_CHART_THEME, HlmChartImports, hlmChartTooltip } from '@shared/ui/chart';
import { HlmEmptyImports } from '@shared/ui/empty';
import { HlmSkeleton } from '@shared/ui/skeleton';
import type { ChartSegment } from '../../../models';

/**
 * Component DonutChart
 * @class DonutChart
 * @description Native Spartan polar chart with a source-derived total. SSR and loading reserve the final geometry; invalid segments never enter the plot.
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-donut-chart',
  imports: [HlmChartImports, HlmSkeleton, DecimalPipe, ...HlmEmptyImports],
  templateUrl: './donut-chart.component.html',
  host: { class: 'block min-w-0' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DonutChart {
  /**
   * Property locale
   * @readonly
   * @description Active locale shared by the visible total and native tooltip.
   * @access private
   * @since 1.0.0
   * @type {string}
   */
  private readonly locale: string = inject(LOCALE_ID);

  /**
   * Property segments
   * @readonly
   * @description Named values in display order.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly ChartSegment[]>}
   */
  public readonly segments: InputSignal<readonly ChartSegment[]> =
    input.required<readonly ChartSegment[]>();

  /**
   * Property label
   * @readonly
   * @description Accessible chart name.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string>}
   */
  public readonly label: InputSignal<string> = input.required<string>();

  /**
   * Property height
   * @readonly
   * @description Reserved chart height in pixels.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<number>}
   */
  public readonly height: InputSignal<number> = input(240);

  /**
   * Property loading
   * @readonly
   * @description Whether the first dataset is loading.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly loading: InputSignal<boolean> = input(false);

  /**
   * Property isBrowser
   * @readonly
   * @description Only mount the SVG after hydration.
   * @access protected
   * @since 1.0.0
   * @type {boolean}
   */
  protected readonly isBrowser: boolean = isPlatformBrowser(inject(PLATFORM_ID));

  /**
   * Property validSegments
   * @readonly
   * @description Finite positive slices; genuine zero totals use an empty state.
   * @access protected
   * @since 1.0.0
   * @type {Signal<readonly ChartSegment[]>}
   */
  protected readonly validSegments: Signal<readonly ChartSegment[]> = computed(() =>
    this.segments().filter((segment) => Number.isFinite(segment.value) && segment.value > 0),
  );

  /**
   * Property total
   * @readonly
   * @description Sum of the actual displayed slices.
   * @access protected
   * @since 1.0.0
   * @type {Signal<number>}
   */
  protected readonly total: Signal<number> = computed(() =>
    this.validSegments().reduce((sum, segment) => sum + segment.value, 0),
  );

  /**
   * Property chartOptions
   * @readonly
   * @description Native polar geometry and theme-aware semantic colors.
   * @access protected
   * @since 1.0.0
   * @type {Signal<ChartOptions<PieDatum<ChartSegment>, number, number>>}
   */
  protected readonly chartOptions: Signal<ChartOptions<PieDatum<ChartSegment>, number, number>> =
    computed(() => {
      const data = this.validSegments();
      const slices = pie(data, { value: 'value' });
      return {
        definition: defineChart(
          {
            marks: [
              polar({
                inset: 8,
                marks: [
                  radialArc(slices, {
                    innerRadius: ({ radius }) => radius * 0.74,
                    cornerRadius: 3,
                    color: 'id',
                    key: 'id',
                    stroke: 'var(--card)',
                    strokeWidth: 3,
                  }),
                ],
                scales: { angle: null, radius: null },
              }),
            ],
            scales: { x: null, y: null },
            color: {
              domain: data.map((segment) => segment.id),
              range: data.map((segment) => 'var(--' + segment.colorToken + ')'),
            },
            theme: HLM_CHART_THEME,
          },
          {
            tooltip: hlmChartTooltip<PieDatum<ChartSegment>, number, number>({
              content: (points) => ({
                rows: points.slice(0, 1).map((point) => ({
                  label: point.datum.label,
                  value: new Intl.NumberFormat(this.locale).format(point.datum.value),
                  color: point.color,
                })),
              }),
            }),
          },
        ),
        ariaLabel: this.label(),
        height: this.height(),
      };
    });
}
