import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';
import type { ChartData, ChartOptions } from 'chart.js';
import { ChartModule } from 'primeng/chart';
import { THEME_PORT, type ThemePort } from '@core/theme';
import type { EquipmentStatusBucket } from '@features/organization/data-access/adapters/organization-dashboard-equipment-status.adapter';
import { DashboardStore } from '@features/organization/state/organization-dashboard';
import { EQUIPMENT_STATUS_OPTIONS } from '@features/organization/ui/components/organization-dashboard/options';
import { TrendCard } from '@shared/components';
import { buildChartTooltipStyle } from '@shared/utils';

/**
 * One legend entry beside the doughnut.
 *
 * @since 1.0.0
 */
interface StatusLegendRow {
  readonly label: string;
  readonly color: string;
  readonly count: number;
}

/**
 * Component EquipmentStatusBreakdown
 * @class EquipmentStatusBreakdown
 *
 * @description
 * The equipment fleet as a doughnut split by status, with a readable legend
 * carrying each status name and count.
 *
 * Labels and colours come from {@link EQUIPMENT_STATUS_OPTIONS}, the same
 * registry the dashboard's status filter uses, so a status renders identically
 * wherever it appears.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-equipment-status-breakdown />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-equipment-status-breakdown',
  imports: [ChartModule, TrendCard],
  templateUrl: './equipment-status-breakdown.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EquipmentStatusBreakdown {
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
   * One row per status, in the registry's own order.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly StatusLegendRow[]>}
   */
  protected readonly legend: Signal<readonly StatusLegendRow[]> = computed(
    (): readonly StatusLegendRow[] =>
      this.store.equipmentByStatus().map((bucket: EquipmentStatusBucket): StatusLegendRow => {
        const option = EQUIPMENT_STATUS_OPTIONS.find((o) => o.value === bucket.status);

        return {
          label: option?.label ?? bucket.status.replace(/_/g, ' '),
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
   * Fleet size across every status, shown at the centre of the doughnut.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<number>}
   */
  protected readonly total: Signal<number> = computed((): number =>
    this.legend().reduce((sum: number, row: StatusLegendRow): number => sum + row.count, 0),
  );

  /**
   * Property hasData
   * @readonly
   *
   * @description
   * `false` for an all-zero fleet, so the card shows an empty message instead
   * of a doughnut with no arc — Chart.js draws nothing for a zero dataset and
   * would otherwise leave a blank square.
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
      labels: this.legend().map((row: StatusLegendRow): string => row.label),
      datasets: [
        {
          data: this.legend().map((row: StatusLegendRow): number => row.count),
          backgroundColor: this.legend().map((row: StatusLegendRow): string => row.color),
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
