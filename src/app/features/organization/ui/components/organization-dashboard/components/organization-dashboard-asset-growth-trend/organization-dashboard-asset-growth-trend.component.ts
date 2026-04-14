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
import { OrganizationDashboardAssetGrowthStore } from '@features/organization/state/organization-dashboard';
import { TrendCard } from '@shared/components';
import type { ChartData, ChartOptions } from 'chart.js';
import {
  alignDashboardTrendSeries,
  getDashboardTrendPointValue,
  sumDashboardTrendValues,
} from '@features/organization/data-access/adapters/organization-dashboard-trend.adapter';
import {
  EQUIPMENT_STATUS_OPTIONS,
  EQUIPMENT_TYPE_OPTIONS,
  FACILITY_TYPE_OPTIONS,
} from '@features/organization/ui/components/organization-dashboard/options';
import type {
  DashboardSummaryMetric,
  EquipmentStatusOption,
  EquipmentTypeOption,
  FacilityTypeOption,
} from '@features/organization/ui/components/organization-dashboard/models';
import {
  DECIMAL_FMT,
  WHOLE_NUMBER_FMT,
  buildDashboardComparison,
} from '@features/organization/ui/components/organization-dashboard/utils';

/**
 * Component OrganizationDashboardAssetGrowthTrend
 * @class OrganizationDashboardAssetGrowthTrend
 *
 * @description
 * Standalone dashboard card that displays equipment and facilities
 * created over time as a combined grouped bar chart.
 *
 * Fetches both trend datasets in parallel via {@link rxResource} and
 * `forkJoin`, aligns them onto a shared time axis using
 * {@link alignDashboardTrendSeries}, and exposes four KPI tiles
 * (Equipment Added, Facilities Added, Combined Growth, Equipment/Facility
 * ratio) above the chart.
 *
 * Supports granularity selection, optional date-range filtering,
 * optional previous-period comparison overlay, and per-dimension
 * type/status/facility-type filters.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-dashboard-asset-growth-trend',
  templateUrl: './organization-dashboard-asset-growth-trend.component.html',
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
  providers: [OrganizationDashboardAssetGrowthStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationDashboardAssetGrowthTrend {
  /**
   * Property activeOrganizationStore
   * @readonly
   *
   * @description
   * Root store used to read the active organization identifier.
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
   * Local store responsible for fetching and transforming the trend data,
   * exposing the summary metrics and chart data, and holding the component's
   * UI state (selected granularity, filters, etc.).
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {OrganizationDashboardAssetGrowthStore}
   */
  protected readonly dashboardStore: OrganizationDashboardAssetGrowthStore =
    inject<OrganizationDashboardAssetGrowthStore>(OrganizationDashboardAssetGrowthStore);

  protected readonly equipmentTypeOptions: EquipmentTypeOption[] = [...EQUIPMENT_TYPE_OPTIONS];

  protected readonly equipmentStatusOptions: EquipmentStatusOption[] = [...EQUIPMENT_STATUS_OPTIONS];

  protected readonly facilityTypeOptions: FacilityTypeOption[] = [...FACILITY_TYPE_OPTIONS];

  protected readonly selectedEquipmentStatusOption: Signal<EquipmentStatusOption | null> = computed(
    () => EQUIPMENT_STATUS_OPTIONS.find((o) => o.value === this.dashboardStore.selectedEquipmentStatus()) ?? null,
  );

  protected readonly selectedFacilityTypeOption: Signal<FacilityTypeOption | null> = computed(
    () => FACILITY_TYPE_OPTIONS.find((o) => o.value === this.dashboardStore.selectedFacilityType()) ?? null,
  );

  protected readonly summaryMetrics: Signal<readonly DashboardSummaryMetric[]> = computed(() => {
    const growth = this.dashboardStore.queryData();
    const compareEnabled = this.dashboardStore.compareEnabled();
    const equipmentSeries = growth?.equipment?.series ?? [];
    const facilitySeries = growth?.facilities?.series ?? [];
    const equipmentTotal = sumDashboardTrendValues(
      equipmentSeries.map((p) => getDashboardTrendPointValue(p)),
    );
    const facilityTotal = sumDashboardTrendValues(
      facilitySeries.map((p) => getDashboardTrendPointValue(p)),
    );
    const previousEquipmentTotal = sumDashboardTrendValues(
      (growth?.equipment?.comparison?.series ?? []).map((p) => getDashboardTrendPointValue(p)),
    );
    const previousFacilityTotal = sumDashboardTrendValues(
      (growth?.facilities?.comparison?.series ?? []).map((p) => getDashboardTrendPointValue(p)),
    );
    const assetsPerFacility =
      facilityTotal > 0 ? Number((equipmentTotal / facilityTotal).toFixed(1)) : 0;
    return [
      {
        label: 'Equipment Added',
        value: WHOLE_NUMBER_FMT.format(equipmentTotal),
        icon: 'pi pi-shield',
        comparison: buildDashboardComparison(equipmentTotal, previousEquipmentTotal, compareEnabled),
      },
      {
        label: 'Facilities Added',
        value: WHOLE_NUMBER_FMT.format(facilityTotal),
        icon: 'pi pi-building',
        comparison: buildDashboardComparison(facilityTotal, previousFacilityTotal, compareEnabled),
      },
      {
        label: 'Combined Growth',
        value: WHOLE_NUMBER_FMT.format(equipmentTotal + facilityTotal),
        icon: 'pi pi-arrow-up-right',
        comparison: buildDashboardComparison(
          equipmentTotal + facilityTotal,
          previousEquipmentTotal + previousFacilityTotal,
          compareEnabled,
        ),
      },
      {
        label: 'Equipment / Facility',
        value: `${DECIMAL_FMT.format(assetsPerFacility)}x`,
        icon: 'pi pi-percentage',
        comparison: null,
      },
    ];
  });

  protected readonly chartData: Signal<ChartData<'bar'>> = computed(() => {
    const growth = this.dashboardStore.queryData();
    const compareEnabled = this.dashboardStore.compareEnabled();
    const aligned = alignDashboardTrendSeries(
      [growth?.equipment?.series, growth?.facilities?.series],
      this.dashboardStore.selectedGranularity(),
    );
    const [equipmentData = [], facilityData = []] = aligned.datasets;
    const datasets: ChartData<'bar'>['datasets'] = [
      {
        label: 'Equipment Created',
        data: equipmentData,
        backgroundColor: '#8b5cf6',
        hoverBackgroundColor: '#7c3aed',
      },
      {
        label: 'Facilities Created',
        data: facilityData,
        backgroundColor: '#14b8a6',
        hoverBackgroundColor: '#0d9488',
      },
    ];
    const equipmentComparisonData = (growth?.equipment?.comparison?.series ?? []).map((p) =>
      getDashboardTrendPointValue(p),
    );
    const facilityComparisonData = (growth?.facilities?.comparison?.series ?? []).map((p) =>
      getDashboardTrendPointValue(p),
    );
    if (compareEnabled && equipmentComparisonData.length > 0) {
      datasets.push({
        label: 'Equipment Previous Period',
        data: equipmentComparisonData,
        backgroundColor: '#c4b5fd',
        hoverBackgroundColor: '#a78bfa',
      });
    }
    if (compareEnabled && facilityComparisonData.length > 0) {
      datasets.push({
        label: 'Facilities Previous Period',
        data: facilityComparisonData,
        backgroundColor: '#99f6e4',
        hoverBackgroundColor: '#5eead4',
      });
    }
    return { labels: [...aligned.labels], datasets };
  });

  protected readonly chartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 500 },
    interaction: { mode: 'index', intersect: false },
    datasets: {
      bar: {
        barPercentage: 0.72,
        categoryPercentage: 0.8,
        borderRadius: 6,
        borderWidth: 0,
      },
    },
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
  };

  /**
   * Property today
   * @readonly
   *
   * @description
   * Upper bound for the date picker. Set once at component creation
   * to prevent selecting future dates.
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
   * Derived from the active organization identifier.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<MenuItem[]>}
   */
  protected readonly menuItems: Signal<MenuItem[]> = computed<MenuItem[]>(() => {
    /**
     * Constant organization
     * @const organization
     *
     * @description
     * Currently active organization, used to construct
     * router links for the menu items.
     *
     * @type {OrganizationOutput | null}
     */
    const organization: OrganizationOutput | null =
      this.activeOrganizationStore.selectedOrganization();

    /**
     * Constant organizationId
     * @const organizationId
     *
     * @description
     * Identifier of the currently active organization, used to construct
     * router links for the menu items. If no organization is active, links
     * will be disabled by setting them to null.
     *
     * @type {string | null}
     */
    const organizationId: string | null = organization ? organization.id : null;

    return [
      {
        label: 'View all equipment',
        icon: PrimeIcons.SHIELD,
        routerLink: organizationId ? ['/organizations', organizationId, 'equipment'] : null,
      },
      {
        label: 'View all facilities',
        icon: PrimeIcons.BUILDING,
        routerLink: organizationId ? ['/organizations', organizationId, 'facilities'] : null,
      },
    ];
  });

  /**
   * Method onMenuToggle
   *
   * @description
   * Toggles the ellipsis popup menu open or closed.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {MouseEvent} event - The click event from the ellipsis button.
   * @returns {void}
   */
  protected onMenuToggle(event: MouseEvent): void {
    const menu: Menu = this.menu();
    menu.toggle(event);
  }
}
