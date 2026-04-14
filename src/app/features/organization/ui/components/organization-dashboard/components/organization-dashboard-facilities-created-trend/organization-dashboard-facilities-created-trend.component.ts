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
import { OrganizationDashboardFacilitiesCreatedStore } from '@features/organization/state/organization-dashboard';
import { TrendCard } from '@shared/components/trend-card';
import type { ChartData, ChartOptions } from 'chart.js';
import {
  getDashboardTrendPointValue,
  sumDashboardTrendValues,
} from '@features/organization/data-access/adapters/organization-dashboard-trend.adapter';
import {
  FACILITY_TYPE_OPTIONS,
} from '@features/organization/ui/components/organization-dashboard/options';
import type {
  DashboardSummaryMetric,
  FacilityTypeOption,
} from '@features/organization/ui/components/organization-dashboard/models';
import {
  WHOLE_NUMBER_FMT,
  buildDashboardComparison,
} from '@features/organization/ui/components/organization-dashboard/utils';

/**
 * Component OrganizationDashboardFacilitiesCreatedTrend
 * @class OrganizationDashboardFacilitiesCreatedTrend
 *
 * @description
 * Dashboard card displaying a bar chart of facilities created over time.
 * All state, filtering and API logic is delegated to
 * {@link OrganizationDashboardFacilitiesCreatedStore}.
 *
 * @version 2.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-dashboard-facilities-created-trend',
  templateUrl: './organization-dashboard-facilities-created-trend.component.html',
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
  providers: [OrganizationDashboardFacilitiesCreatedStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationDashboardFacilitiesCreatedTrend {
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
   * @type {OrganizationDashboardFacilitiesCreatedStore}
   */
  protected readonly dashboardStore: OrganizationDashboardFacilitiesCreatedStore =
    inject<OrganizationDashboardFacilitiesCreatedStore>(
      OrganizationDashboardFacilitiesCreatedStore,
    );

  protected readonly facilityTypeOptions: FacilityTypeOption[] = [...FACILITY_TYPE_OPTIONS];

  protected readonly selectedFacilityTypeOption: Signal<FacilityTypeOption | null> = computed(
    () => FACILITY_TYPE_OPTIONS.find((o) => o.value === this.dashboardStore.selectedFacilityType()) ?? null,
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
        label: 'Facilities Created',
        value: WHOLE_NUMBER_FMT.format(total),
        icon: 'pi pi-building',
        comparison: buildDashboardComparison(total, previousTotal, compareEnabled),
      },
    ];
  });

  protected readonly chartData: Signal<ChartData<'bar'>> = computed(() => {
    const trend = this.dashboardStore.queryData();
    const compareEnabled = this.dashboardStore.compareEnabled();
    const data = (trend?.series ?? []).map((p) => getDashboardTrendPointValue(p));
    const comparisonData = (trend?.comparison?.series ?? []).map((p) =>
      getDashboardTrendPointValue(p),
    );
    const datasets: ChartData<'bar'>['datasets'] = [
      {
        label: 'Facilities Created',
        data,
        backgroundColor: '#14b8a6',
        hoverBackgroundColor: '#0d9488',
      },
    ];
    if (compareEnabled && comparisonData.length > 0) {
      datasets.push({
        label: 'Previous Period',
        data: comparisonData,
        backgroundColor: '#99f6e4',
        hoverBackgroundColor: '#5eead4',
      });
    }
    return { labels: (trend?.series ?? []).map(() => ''), datasets };
  });

  protected readonly chartOptions: Signal<ChartOptions<'bar'>> = computed(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 500 },
    interaction: { mode: 'index', intersect: false },
    datasets: {
      bar: {
        barPercentage: 0.65,
        categoryPercentage: 0.8,
        borderRadius: 6,
        borderSkipped: 'start' as const,
        borderWidth: 0,
      },
    },
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
        label: 'View all facilities',
        icon: PrimeIcons.LIST,
        routerLink: organizationId ? ['/organizations', organizationId, 'facilities'] : null,
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
