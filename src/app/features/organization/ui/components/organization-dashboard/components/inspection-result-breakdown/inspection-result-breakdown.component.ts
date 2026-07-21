import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';
import type { ChartData, ChartOptions } from 'chart.js';
import { ChartModule } from 'primeng/chart';
import { THEME_PORT, type ThemePort } from '@core/theme';
import type { InspectionResultBucket } from '@features/organization/data-access/adapters/organization-dashboard-inspection-result.adapter';
import { DashboardStore } from '@features/organization/state/organization-dashboard';
import { INSPECTION_RESULT_OPTIONS } from '@features/organization/ui/components/organization-dashboard/options';
import { TrendCard } from '@shared/components';
import { buildChartTooltipStyle } from '@shared/utils';

/**
 * One legend entry beside the doughnut.
 *
 * @since 1.0.0
 */
interface ResultLegendRow {
  readonly label: string;
  readonly color: string;
  readonly count: number;
}

/**
 * Component InspectionResultBreakdown
 * @class InspectionResultBreakdown
 *
 * @description
 * Inspection outcomes as a doughnut split by result, with a readable legend
 * carrying each result name and count.
 *
 * Labels and colours come from {@link INSPECTION_RESULT_OPTIONS}, the same
 * registry the dashboard's result filter uses, so an outcome renders
 * identically wherever it appears.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-inspection-result-breakdown />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-inspection-result-breakdown',
  imports: [ChartModule, TrendCard],
  templateUrl: './inspection-result-breakdown.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InspectionResultBreakdown {
  //#region Properties
  /**
   * Property store
   * @readonly
   *
   * @access private
   * @since 1.0.0
   *
   * @type {DashboardStore}
   */
  private readonly store: DashboardStore = inject<DashboardStore>(DashboardStore);

  /**
   * Property themePort
   * @readonly
   *
   * @description
   * Neutral theme contract, so the canvas tooltip restyles itself when the
   * user switches appearance.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {ThemePort}
   */
  private readonly themePort: ThemePort = inject<ThemePort>(THEME_PORT);

  /**
   * Property isLoading
   * @readonly
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly isLoading: Signal<boolean> = computed((): boolean =>
    this.store.isQueryLoading(),
  );

  /**
   * Property legend
   * @readonly
   *
   * @description
   * One row per result, best outcome first.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly ResultLegendRow[]>}
   */
  protected readonly legend: Signal<readonly ResultLegendRow[]> = computed(
    (): readonly ResultLegendRow[] =>
      this.store.inspectionsByResult().map((bucket: InspectionResultBucket): ResultLegendRow => {
        const option = INSPECTION_RESULT_OPTIONS.find((o) => o.value === bucket.result);

        return {
          label: option?.label ?? bucket.result,
          color: option?.color ?? '#94a3b8',
          count: bucket.count,
        };
      }),
  );

  /**
   * Property total
   * @readonly
   *
   * @description
   * Inspections with a recorded outcome, shown at the centre of the doughnut.
   * Deliberately not the inspection total: a draft has no result yet, so
   * counting it here would leave a slice of the ring unaccounted for.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<number>}
   */
  protected readonly total: Signal<number> = computed((): number =>
    this.legend().reduce((sum: number, row: ResultLegendRow): number => sum + row.count, 0),
  );

  /**
   * Property hasData
   * @readonly
   *
   * @description
   * `false` when nothing has been graded yet, so the card shows an empty
   * message instead of a doughnut with no arc — Chart.js draws nothing for a
   * zero dataset and would otherwise leave a blank square.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly hasData: Signal<boolean> = computed((): boolean => this.total() > 0);

  /**
   * Property data
   * @readonly
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<ChartData<'doughnut'>>}
   */
  protected readonly data: Signal<ChartData<'doughnut'>> = computed(
    (): ChartData<'doughnut'> => ({
      labels: this.legend().map((row: ResultLegendRow): string => row.label),
      datasets: [
        {
          data: this.legend().map((row: ResultLegendRow): number => row.count),
          backgroundColor: this.legend().map((row: ResultLegendRow): string => row.color),
          borderWidth: 0,
        },
      ],
    }),
  );

  /**
   * Property options
   * @readonly
   *
   * @description
   * The built-in legend stays off: the rendered legend beside the canvas is
   * selectable text and survives with images disabled, which a canvas legend
   * does not.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<ChartOptions<'doughnut'>>}
   */
  protected readonly options: Signal<ChartOptions<'doughnut'>> = computed(
    (): ChartOptions<'doughnut'> => ({
      responsive: true,
      maintainAspectRatio: false,
      cutout: '68%',
      animation: { duration: 500 },
      plugins: {
        legend: { display: false },
        tooltip: {
          ...buildChartTooltipStyle(this.themePort.resolvedTheme() === 'dark'),
          callbacks: {
            label: (item) => ` ${item.label}: ${item.formattedValue}`,
          },
        },
      },
    }),
  );
  //#endregion
}
