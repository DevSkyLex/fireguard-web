import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  viewChild,
  type Signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
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
import type { OrganizationOutput } from '@features/organization/models';
import { ActiveOrganizationStore } from '@features/organization/state';
import { OrganizationDashboardNonConformitiesResolvedStore } from '@features/organization/state/organization-dashboard';
import { TrendCard } from '@shared/components';
import type { ChartData, ChartOptions, ScriptableContext } from 'chart.js';
import {
  getDashboardTrendPointValue,
  sumDashboardTrendValues,
} from '@features/organization/data-access/adapters/organization-dashboard-trend.adapter';
import {
  NON_CONFORMITY_STATUS_OPTIONS,
  NON_CONFORMITY_SEVERITY_OPTIONS,
} from '@features/organization/ui/components/organization-dashboard/options';
import type {
  DashboardSummaryMetric,
  NonConformityStatusOption,
  NonConformitySeverityOption,
} from '@features/organization/ui/components/organization-dashboard/models';
import {
  WHOLE_NUMBER_FMT,
  buildDashboardComparison,
} from '@features/organization/ui/components/organization-dashboard/utils';

/**
 * Component OrganizationDashboardNonConformitiesResolvedTrend
 * @class OrganizationDashboardNonConformitiesResolvedTrend
 *
 * @description
 * Dashboard card that displays a line chart of the resolved non-conformities
 * trend. All state, filtering and API logic is delegated to
 * {@link OrganizationDashboardNonConformitiesResolvedStore}.
 *
 * @version 2.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-dashboard-non-conformities-resolved-trend',
  templateUrl: './organization-dashboard-non-conformities-resolved-trend.component.html',
  imports: [
    TrendCard,
    FormsModule,
    ButtonModule,
    ChartModule,
    DatePickerModule,
    InputGroupAddonModule,
    InputGroupModule,
    MenuModule,
    SelectModule,
    SkeletonModule,
    ToggleButtonModule,
  ],
  providers: [OrganizationDashboardNonConformitiesResolvedStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationDashboardNonConformitiesResolvedTrend {
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
   * @type {OrganizationDashboardNonConformitiesResolvedStore}
   */
  protected readonly dashboardStore: OrganizationDashboardNonConformitiesResolvedStore =
    inject<OrganizationDashboardNonConformitiesResolvedStore>(
      OrganizationDashboardNonConformitiesResolvedStore,
    );

  protected readonly nonConformityStatusOptions: NonConformityStatusOption[] = [...NON_CONFORMITY_STATUS_OPTIONS];

  protected readonly nonConformitySeverityOptions: NonConformitySeverityOption[] = [...NON_CONFORMITY_SEVERITY_OPTIONS];

  protected readonly selectedNonConformityStatusOption: Signal<NonConformityStatusOption | null> = computed(
    () => NON_CONFORMITY_STATUS_OPTIONS.find((o) => o.value === this.dashboardStore.selectedNonConformityStatus()) ?? null,
  );

  protected readonly selectedSeverityOption: Signal<NonConformitySeverityOption | null> = computed(
    () => NON_CONFORMITY_SEVERITY_OPTIONS.find((o) => o.value === this.dashboardStore.selectedNonConformitySeverity()) ?? null,
  );

  protected readonly summaryMetrics: Signal<readonly DashboardSummaryMetric[]> = computed(() => {
    const trend = this.dashboardStore.queryData();
    const compareEnabled = this.dashboardStore.compareEnabled();
    const total = sumDashboardTrendValues(
      (trend?.series ?? []).map((p) => getDashboardTrendPointValue(p)),
    );
    const previousTotal = sumDashboardTrendValues(
      (trend?.comparison?.series ?? []).map((p) => getDashboardTrendPointValue(p)),
    );
    return [
      {
        label: 'Resolved NC',
        value: WHOLE_NUMBER_FMT.format(total),
        icon: 'pi pi-check-circle',
        comparison: buildDashboardComparison(total, previousTotal, compareEnabled),
      },
    ];
  });

  protected readonly chartData: Signal<ChartData<'line'>> = computed(() => {
    const trend = this.dashboardStore.queryData();
    const compareEnabled = this.dashboardStore.compareEnabled();
    const data = (trend?.series ?? []).map((p) => getDashboardTrendPointValue(p));
    const comparisonData = (trend?.comparison?.series ?? []).map((p) =>
      getDashboardTrendPointValue(p),
    );
    const datasets: ChartData<'line'>['datasets'] = [
      {
        label: 'Non-Conformities Resolved',
        data,
        borderColor: '#22c55e',
        backgroundColor: (context: ScriptableContext<'line'>) => {
          const { ctx, chartArea } = context.chart;
          if (!chartArea) return 'rgba(34, 197, 94, 0)';
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, 'rgba(34, 197, 94, 0.25)');
          gradient.addColorStop(1, 'rgba(34, 197, 94, 0)');
          return gradient;
        },
        borderWidth: 2,
        tension: 0.3,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBorderWidth: 2,
        pointHoverBorderColor: '#fff',
        pointHoverBackgroundColor: '#22c55e',
        fill: 'origin',
      },
    ];
    if (compareEnabled && comparisonData.length > 0) {
      datasets.push({
        label: 'Previous Period',
        data: comparisonData,
        borderColor: '#86efac',
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderDash: [4, 4],
        tension: 0.3,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHoverBorderWidth: 2,
        pointHoverBorderColor: '#fff',
        pointHoverBackgroundColor: '#86efac',
        fill: false,
      });
    }
    return { labels: (trend?.series ?? []).map(() => ''), datasets };
  });

  protected readonly chartOptions: Signal<ChartOptions<'line'>> = computed(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 500 },
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        display: this.dashboardStore.compareEnabled(),
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
        beginAtZero: true,
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
  }));

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
        label: 'View all non-conformities',
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
