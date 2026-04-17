import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  viewChild,
  type Signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { ChartData, ChartOptions } from 'chart.js';
import { PrimeIcons } from 'primeng/api';
import type { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ChartModule } from 'primeng/chart';
import { DatePickerModule } from 'primeng/datepicker';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { Menu, MenuModule } from 'primeng/menu';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { ToggleButtonModule } from 'primeng/togglebutton';
import {
  alignDashboardTrendSeries,
  buildDifferenceSeries,
  sumDashboardTrendValues,
  sumTrendSeries,
} from '@features/organization/data-access/adapters/organization-dashboard-trend.adapter';
import type { OrganizationOutput } from '@features/organization/models';
import { ActiveOrganizationStore } from '@features/organization/state';
import { OrganizationDashboardOverviewTrendStore } from '@features/organization/state/organization-dashboard';
import type { DashboardSummaryMetric } from '@features/organization/ui/components/organization-dashboard/models';
import {
  WHOLE_NUMBER_FMT,
  buildDashboardComparison,
} from '@features/organization/ui/components/organization-dashboard/utils';
import { TrendCard } from '@shared/components';

/**
 * Component OrganizationDashboardOverviewTrend
 * @class OrganizationDashboardOverviewTrend
 *
 * @description
 * Dashboard card displaying a multi-series line chart of the operational flow.
 * All state, filtering and API logic is delegated to
 * {@link OrganizationDashboardOverviewTrendStore}.
 *
 * @version 2.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-dashboard-overview-trend',
  templateUrl: './organization-dashboard-overview-trend.component.html',
  imports: [
    TrendCard,
    FormsModule,
    ButtonModule,
    ChartModule,
    MenuModule,
    SkeletonModule,
    SelectModule,
    InputGroupModule,
    InputGroupAddonModule,
    ToggleButtonModule,
    DatePickerModule,
  ],
  providers: [OrganizationDashboardOverviewTrendStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationDashboardOverviewTrend {
  //#region Properties

  /**
   * Property activeOrganizationStore
   * @readonly
   *
   * @description
   * Root store used to read the active organization identifier
   * and build navigation links.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {ActiveOrganizationStore}
   */
  private readonly activeOrganizationStore: ActiveOrganizationStore =
    inject<ActiveOrganizationStore>(ActiveOrganizationStore);

  /**
   * Property dashboardStore
   * @readonly
   *
   * @description
   * Local store that owns all state, chart data and API calls for this card.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {OrganizationDashboardOverviewTrendStore}
   */
  protected readonly dashboardStore: OrganizationDashboardOverviewTrendStore =
    inject<OrganizationDashboardOverviewTrendStore>(OrganizationDashboardOverviewTrendStore);

  /**
   * Property alignedTrend
   * @readonly
   *
   * @description
   * Shared computed that aligns the three sparse API series onto a common
   * sorted bucket axis. Derived once and consumed by both `summaryMetrics`
   * and `chartData` to avoid redundant computation.
   *
   * @access private
   * @since 2.1.0
   */
  private readonly alignedTrend = computed(() => {
    const result = this.dashboardStore.queryData();

    return alignDashboardTrendSeries(
      [result?.inspections?.series, result?.ncOpened?.series, result?.ncResolved?.series],
      this.dashboardStore.selectedGranularity(),
    );
  });

  protected readonly summaryMetrics: Signal<readonly DashboardSummaryMetric[]> = computed(() => {
    const result = this.dashboardStore.queryData();
    const compareEnabled = this.dashboardStore.compareEnabled();
    const [inspectionData = [], openedData = [], resolvedData = []] = this.alignedTrend().datasets;
    const netPressureData = buildDifferenceSeries(openedData, resolvedData);
    const inspectionTotal = sumDashboardTrendValues(inspectionData);
    const openedTotal = sumDashboardTrendValues(openedData);
    const resolvedTotal = sumDashboardTrendValues(resolvedData);
    const netPressureTotal = sumDashboardTrendValues(netPressureData);
    const previousInspectionTotal = sumTrendSeries(result?.inspections?.comparison?.series);
    const previousOpenedTotal = sumTrendSeries(result?.ncOpened?.comparison?.series);
    const previousResolvedTotal = sumTrendSeries(result?.ncResolved?.comparison?.series);
    const previousNetPressure = previousOpenedTotal - previousResolvedTotal;
    return [
      {
        label: 'Inspections',
        value: WHOLE_NUMBER_FMT.format(inspectionTotal),
        icon: 'pi pi-list-check',
        comparison: buildDashboardComparison(
          inspectionTotal,
          previousInspectionTotal,
          compareEnabled,
        ),
      },
      {
        label: 'Opened NC',
        value: WHOLE_NUMBER_FMT.format(openedTotal),
        icon: 'pi pi-exclamation-triangle',
        comparison: buildDashboardComparison(openedTotal, previousOpenedTotal, compareEnabled),
      },
      {
        label: 'Resolved NC',
        value: WHOLE_NUMBER_FMT.format(resolvedTotal),
        icon: 'pi pi-check-circle',
        comparison: buildDashboardComparison(resolvedTotal, previousResolvedTotal, compareEnabled),
      },
      {
        label: 'Net Pressure',
        value: WHOLE_NUMBER_FMT.format(netPressureTotal),
        icon: 'pi pi-gauge',
        comparison: buildDashboardComparison(netPressureTotal, previousNetPressure, compareEnabled),
      },
    ];
  });

  protected readonly chartData: Signal<ChartData<'line'>> = computed(() => {
    const [inspectionData = [], openedData = [], resolvedData = []] = this.alignedTrend().datasets;
    const netPressureData = buildDifferenceSeries(openedData, resolvedData);
    return {
      labels: [...this.alignedTrend().labels],
      datasets: [
        {
          label: 'Inspections',
          data: inspectionData,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.08)',
          borderWidth: 2,
          tension: 0.3,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBorderWidth: 2,
          pointHoverBorderColor: '#fff',
          pointHoverBackgroundColor: '#3b82f6',
          fill: false,
        },
        {
          label: 'NC Opened',
          data: openedData,
          borderColor: '#f97316',
          backgroundColor: 'rgba(249, 115, 22, 0.08)',
          borderWidth: 2,
          tension: 0.3,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBorderWidth: 2,
          pointHoverBorderColor: '#fff',
          pointHoverBackgroundColor: '#f97316',
          fill: false,
        },
        {
          label: 'NC Resolved',
          data: resolvedData,
          borderColor: '#22c55e',
          backgroundColor: 'rgba(34, 197, 94, 0.08)',
          borderWidth: 2,
          tension: 0.3,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBorderWidth: 2,
          pointHoverBorderColor: '#fff',
          pointHoverBackgroundColor: '#22c55e',
          fill: false,
        },
        {
          label: 'Net Pressure',
          data: netPressureData,
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99, 102, 241, 0.08)',
          borderWidth: 2,
          borderDash: [5, 4],
          tension: 0.3,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBorderWidth: 2,
          pointHoverBorderColor: '#fff',
          pointHoverBackgroundColor: '#6366f1',
          fill: false,
        },
      ],
    };
  });

  protected readonly chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 400 },
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          boxWidth: 8,
          boxHeight: 8,
          padding: 16,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.92)',
        titleColor: '#f1f5f9',
        bodyColor: '#94a3b8',
        borderColor: 'rgba(255, 255, 255, 0.08)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 10,
        callbacks: {
          title: (items) => items[0]?.label ?? '',
          label: (item) => ` ${item.dataset.label}: ${item.formattedValue}`,
        },
      },
    },
    scales: {
      x: { border: { display: false }, grid: { display: false }, ticks: { display: false } },
      y: {
        border: { display: false },
        beginAtZero: false,
        grid: { color: 'rgba(0, 0, 0, 0.04)', drawTicks: false },
        ticks: {
          precision: 0,
          maxTicksLimit: 5,
          color: '#94a3b8',
          font: { size: 11 },
          padding: 8,
        },
      },
    },
  };

  /**
   * Property today
   * @readonly
   *
   * @description
   * Upper bound for the date picker. Prevents selecting future dates.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Date}
   */
  protected readonly today: Date = new Date();

  /**
   * Property menu
   * @readonly
   *
   * @description
   * Reference to the PrimeNG popup Menu used by the ellipsis button.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Signal<Menu>}
   */
  private readonly menu: Signal<Menu> = viewChild.required<Menu>('actionMenu');

  /**
   * Property menuItems
   * @readonly
   *
   * @description
   * Navigation links shown inside the ellipsis popup menu.
   * Derived from the currently active organization.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<MenuItem[]>}
   */
  protected readonly menuItems: Signal<MenuItem[]> = computed<MenuItem[]>(() => {
    const organization: OrganizationOutput | null =
      this.activeOrganizationStore.selectedOrganization();
    const organizationId: string | null = organization ? organization.id : null;
    return [
      {
        label: 'View all inspections',
        icon: PrimeIcons.LIST,
        routerLink: organizationId ? ['/organizations', organizationId, 'inspections'] : null,
      },
    ];
  });

  //#endregion

  //#region Methods

  /**
   * Method onMenuToggle
   *
   * @description
   * Toggles the ellipsis popup menu open or closed.
   *
   * @access protected
   * @since 2.0.0
   *
   * @param {MouseEvent} event - The click event from the ellipsis button.
   * @returns {void}
   */
  protected onMenuToggle(event: MouseEvent): void {
    this.menu().toggle(event);
  }

  //#endregion
}
