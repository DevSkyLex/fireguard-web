import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  ResourceRef,
  signal,
  viewChild,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ChartModule } from 'primeng/chart';
import { DatePickerModule } from 'primeng/datepicker';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { InputGroupModule } from 'primeng/inputgroup';
import { PrimeIcons } from 'primeng/api';
import { Menu, MenuModule } from 'primeng/menu';
import type { MenuItem } from 'primeng/api';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { ToggleButtonModule } from 'primeng/togglebutton';
import { forkJoin } from 'rxjs';
import type { ChartData, ChartOptions } from 'chart.js';
import { OrganizationDashboardTrendCard } from '../organization-dashboard-trend-card/organization-dashboard-trend-card.component';
import type { OrganizationDashboardMetricCardComparison } from '../organization-dashboard-metric-card';
import { OrganizationService } from '@core/services/api/organization';
import { ActiveOrganizationStore } from '@core/stores/organization';
import type {
  OrganizationDashboardEquipmentStatus,
  OrganizationDashboardEquipmentType,
  OrganizationDashboardGranularity,
  OrganizationDashboardTrendOutput,
  OrganizationDashboardTrendResourceParams,
  OrganizationOutput,
} from '@core/models/organization';
import type { FacilityType } from '@core/models/facility';
import {
  alignDashboardTrendSeries,
  getDashboardTrendPointValue,
  sumDashboardTrendValues,
} from '../organization-dashboard-trend.utils';

type OrganizationDashboardAssetGrowthResource = {
  readonly equipment: OrganizationDashboardTrendOutput;
  readonly facilities: OrganizationDashboardTrendOutput;
};

type OrganizationDashboardAssetGrowthParams =
  OrganizationDashboardTrendResourceParams & {
    readonly equipmentType?: OrganizationDashboardEquipmentType;
    readonly equipmentStatus?: OrganizationDashboardEquipmentStatus;
    readonly facilityType?: FacilityType;
  };

/**
 * Type OrganizationDashboardAssetGrowthSummaryMetric
 *
 * @description
 * Shape of a single KPI tile rendered above the asset growth chart.
 * Maps directly onto the inputs expected by
 * {@link OrganizationDashboardMetricCard}.
 */
type OrganizationDashboardAssetGrowthSummaryMetric = {
  readonly label: string;
  readonly value: string;
  readonly icon: string | null;
  readonly comparison: OrganizationDashboardMetricCardComparison | null;
};

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
    OrganizationDashboardTrendCard,
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
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationDashboardAssetGrowthTrend {
  /**
   * Property organizationService
   * @readonly
   *
   * @description
   * Angular service used to fetch equipment and facility trend datasets.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {OrganizationService}
   */
  private readonly organizationService = inject(OrganizationService);

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
  private readonly activeOrganizationStore = inject(ActiveOrganizationStore);

  /**
   * Property wholeNumberFormatter
   * @readonly
   *
   * @description
   * Formats counts as whole en-US numbers (no decimals).
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Intl.NumberFormat}
   */
  private readonly wholeNumberFormatter = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  });

  /**
   * Property decimalFormatter
   * @readonly
   *
   * @description
   * Formats the equipment-per-facility ratio with one decimal place.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Intl.NumberFormat}
   */
  private readonly decimalFormatter = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 1,
  });

  /**
   * Property growthResource
   * @readonly
   *
   * @description
   * Reactive resource that fetches equipment-created and facilities-created
   * trend datasets in parallel via `forkJoin` whenever the active
   * organization, granularity, date range, compare flag, or dimension
   * filters change. Stays idle when no organization is selected.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {ResourceRef<OrganizationDashboardAssetGrowthResource | undefined>}
   */
  protected readonly growthResource: ResourceRef<OrganizationDashboardAssetGrowthResource | undefined> = rxResource<OrganizationDashboardAssetGrowthResource, OrganizationDashboardAssetGrowthParams | undefined>({
    params: () => {
      const organization: OrganizationOutput | null =
        this.activeOrganizationStore.selectedOrganization();

      if (!organization) return undefined;

      const range: Date[] | null = this.selectedDateRange();
      const toISO = (value: Date | undefined): string | undefined => value?.toISOString();

      return {
        organizationId: organization.id,
        granularity: this.selectedGranularity(),
        from: toISO(range?.[0]),
        to: toISO(range?.[1]),
        compare: this.compareEnabled() || undefined,
        equipmentType: this.selectedEquipmentType() ?? undefined,
        equipmentStatus: this.selectedEquipmentStatus() ?? undefined,
        facilityType: this.selectedFacilityType() ?? undefined,
      };
    },
    stream: ({ params }: { params: OrganizationDashboardAssetGrowthParams }) =>
      forkJoin({
        equipment: this.organizationService.getDashboardEquipmentCreatedTrend(
          params.organizationId,
          {
            granularity: params.granularity,
            from: params.from,
            to: params.to,
            compare: params.compare,
            equipmentType: params.equipmentType,
            equipmentStatus: params.equipmentStatus,
          },
        ),
        facilities: this.organizationService.getDashboardFacilitiesCreatedTrend(
          params.organizationId,
          {
            granularity: params.granularity,
            from: params.from,
            to: params.to,
            compare: params.compare,
            facilityType: params.facilityType,
          },
        ),
      }),
  });

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
  protected readonly menuItems: Signal<MenuItem[]> = computed(() => {
    const organizationId = this.activeOrganizationStore.selectedOrganization()?.id;

    return [
      {
        label: 'View all equipment',
        icon: PrimeIcons.SHIELD,
        routerLink: organizationId
          ? ['/organizations', organizationId, 'equipment']
          : null,
      },
      {
        label: 'View all facilities',
        icon: PrimeIcons.BUILDING,
        routerLink: organizationId
          ? ['/organizations', organizationId, 'facilities']
          : null,
      },
    ];
  });

  /**
   * Property granularityOptions
   *
   * @description
   * Available granularity options for the period selector.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {{ label: string; value: OrganizationDashboardGranularity }[]}
   */
  protected granularityOptions: {
    label: string;
    value: OrganizationDashboardGranularity;
  }[] = [
    { label: 'Daily', value: 'day' },
    { label: 'Weekly', value: 'week' },
    { label: 'Monthly', value: 'month' },
  ];

  /**
   * Property selectedGranularity
   * @readonly
   *
   * @description
   * The currently selected time granularity for the chart.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<OrganizationDashboardGranularity>}
   */
  protected readonly selectedGranularity: WritableSignal<OrganizationDashboardGranularity> =
    signal<OrganizationDashboardGranularity>('month');

  /**
   * Property selectedDateRange
   * @readonly
   *
   * @description
   * The currently selected date range forwarded to the API as ISO 8601
   * strings. Null means no date filter is applied.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<Date[] | null>}
   */
  protected readonly selectedDateRange: WritableSignal<Date[] | null> = signal<Date[] | null>([
    new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
    new Date(),
  ]);
  /**
   * Property compareEnabled
   * @readonly
   *
   * @description
   * Whether previous-period comparison mode is active. When true, the API
   * returns a second series and the chart renders semi-transparent
   * comparison datasets.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly compareEnabled: WritableSignal<boolean> = signal<boolean>(true);

  /**
   * Property equipmentTypeOptions
   *
   * @description
   * Selectable equipment type filter options.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {{ label: string; value: OrganizationDashboardEquipmentType }[]}
   */
  protected equipmentTypeOptions: {
    label: string;
    value: OrganizationDashboardEquipmentType;
  }[] = [
    { label: 'Fire Extinguisher', value: 'fire_extinguisher' },
    { label: 'Smoke Detector', value: 'smoke_detector' },
    { label: 'Heat Detector', value: 'heat_detector' },
    { label: 'Sprinkler', value: 'sprinkler' },
    { label: 'Fire Alarm Panel', value: 'fire_alarm_panel' },
    { label: 'Hydrant', value: 'hydrant' },
    { label: 'Fire Door', value: 'fire_door' },
    { label: 'Emergency Lighting', value: 'emergency_lighting' },
    { label: 'Access Control', value: 'access_control' },
    { label: 'Camera', value: 'camera' },
    { label: 'Gas Detector', value: 'gas_detector' },
    { label: 'Other', value: 'other' },
  ];
  /**
   * Property selectedEquipmentType
   * @readonly
   *
   * @description
   * The currently selected equipment type filter, or null for all types.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<OrganizationDashboardEquipmentType | null>}
   */
  protected readonly selectedEquipmentType: WritableSignal<OrganizationDashboardEquipmentType | null> =
    signal<OrganizationDashboardEquipmentType | null>(null);

  /**
   * Property equipmentStatusOptions
   *
   * @description
   * Selectable equipment status filter options, each with an icon and color.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {{ label: string; value: OrganizationDashboardEquipmentStatus; icon: string; color: string }[]}
   */
  protected equipmentStatusOptions: {
    label: string;
    value: OrganizationDashboardEquipmentStatus;
    icon: string;
    color: string;
  }[] = [
    { label: 'In Stock', value: 'in_stock', icon: 'pi pi-box', color: '#94a3b8' },
    {
      label: 'Operational',
      value: 'operational',
      icon: 'pi pi-check-circle',
      color: '#22c55e',
    },
    {
      label: 'Under Maintenance',
      value: 'under_maintenance',
      icon: 'pi pi-wrench',
      color: '#f97316',
    },
    {
      label: 'Decommissioned',
      value: 'decommissioned',
      icon: 'pi pi-ban',
      color: '#ef4444',
    },
  ];
  /**
   * Property selectedEquipmentStatus
   * @readonly
   *
   * @description
   * The currently selected equipment status filter, or null for all statuses.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<OrganizationDashboardEquipmentStatus | null>}
   */
  protected readonly selectedEquipmentStatus: WritableSignal<OrganizationDashboardEquipmentStatus | null> =
    signal<OrganizationDashboardEquipmentStatus | null>(null);

  /**
   * Property selectedEquipmentStatusOption
   * @readonly
   *
   * @description
   * Derived option object matching {@link selectedEquipmentStatus},
   * used to render the custom selected-item template in the status
   * dropdown (icon + label).
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<{ label: string; value: OrganizationDashboardEquipmentStatus; icon: string; color: string } | null>}
   */
  protected readonly selectedEquipmentStatusOption = computed(() =>
    this.equipmentStatusOptions.find(
      (option) => option.value === this.selectedEquipmentStatus(),
    ) ?? null,
  );

  /**
   * Property facilityTypeOptions
   *
   * @description
   * Selectable facility type filter options, each with an icon.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {{ label: string; value: FacilityType; icon: string }[]}
   */
  protected facilityTypeOptions: {
    label: string;
    value: FacilityType;
    icon: string;
  }[] = [
    { label: 'Site', value: 'site', icon: 'pi pi-map-marker' },
    { label: 'Building', value: 'building', icon: 'pi pi-building' },
    { label: 'Floor', value: 'floor', icon: 'pi pi-th-large' },
    { label: 'Zone', value: 'zone', icon: 'pi pi-stop' },
    { label: 'Area', value: 'area', icon: 'pi pi-table' },
  ];
  /**
   * Property selectedFacilityType
   * @readonly
   *
   * @description
   * The currently selected facility type filter, or null for all types.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<FacilityType | null>}
   */
  protected readonly selectedFacilityType: WritableSignal<FacilityType | null> =
    signal<FacilityType | null>(null);

  /**
   * Property selectedFacilityTypeOption
   * @readonly
   *
   * @description
   * Derived option object matching {@link selectedFacilityType},
   * used to render the custom selected-item template in the facility-type
   * dropdown (icon + label).
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<{ label: string; value: FacilityType; icon: string } | null>}
   */
  protected readonly selectedFacilityTypeOption = computed(() =>
    this.facilityTypeOptions.find(
      (option) => option.value === this.selectedFacilityType(),
    ) ?? null,
  );

  /**
   * Property summaryMetrics
   * @readonly
   *
   * @description
   * Four KPI tiles rendered above the chart: Equipment Added, Facilities
   * Added, Combined Growth, and Equipment-per-Facility ratio.
   * Automatically recomputes when the resource value changes.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly OrganizationDashboardAssetGrowthSummaryMetric[]>}
   */
  protected readonly summaryMetrics: Signal<readonly OrganizationDashboardAssetGrowthSummaryMetric[]> = computed(() => {
    const growth = this.growthResource.value();
    const equipmentSeries = growth?.equipment?.series ?? [];
    const facilitySeries = growth?.facilities?.series ?? [];
    const equipmentTotal = sumDashboardTrendValues(
      equipmentSeries.map((point) => getDashboardTrendPointValue(point)),
    );
    const facilityTotal = sumDashboardTrendValues(
      facilitySeries.map((point) => getDashboardTrendPointValue(point)),
    );
    const previousEquipmentTotal = sumDashboardTrendValues(
      (growth?.equipment?.comparison?.series ?? []).map((point) => getDashboardTrendPointValue(point)),
    );
    const previousFacilityTotal = sumDashboardTrendValues(
      (growth?.facilities?.comparison?.series ?? []).map((point) => getDashboardTrendPointValue(point)),
    );
    const assetsPerFacility =
      facilityTotal > 0 ? Number((equipmentTotal / facilityTotal).toFixed(1)) : 0;

    return [
      {
        label: 'Equipment Added',
        value: this.formatWholeNumber(equipmentTotal),
        icon: 'pi pi-shield',
        comparison: this.buildComparison(equipmentTotal, previousEquipmentTotal),
      },
      {
        label: 'Facilities Added',
        value: this.formatWholeNumber(facilityTotal),
        icon: 'pi pi-building',
        comparison: this.buildComparison(facilityTotal, previousFacilityTotal),
      },
      {
        label: 'Combined Growth',
        value: this.formatWholeNumber(equipmentTotal + facilityTotal),
        icon: 'pi pi-arrow-up-right',
        comparison: this.buildComparison(
          equipmentTotal + facilityTotal,
          previousEquipmentTotal + previousFacilityTotal,
        ),
      },
      {
        label: 'Equipment / Facility',
        value: `${this.decimalFormatter.format(assetsPerFacility)}x`,
        icon: 'pi pi-percentage',
        comparison: null,
      },
    ];
  });

  /**
   * Property chartData
   * @readonly
   *
   * @description
   * Reactive Chart.js dataset derived from the aligned equipment and
   * facilities series. Appends comparison datasets when compare mode is
   * active and the API returns previous-period data.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<ChartData<'bar'>>}
   */
  protected readonly chartData: Signal<ChartData<'bar'>> = computed(() => {
    const growth = this.growthResource.value();
    const aligned = alignDashboardTrendSeries(
      [growth?.equipment?.series, growth?.facilities?.series],
      this.selectedGranularity(),
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

    const equipmentComparisonData = (growth?.equipment?.comparison?.series ?? []).map((point) =>
      getDashboardTrendPointValue(point),
    );
    const facilityComparisonData = (growth?.facilities?.comparison?.series ?? []).map((point) =>
      getDashboardTrendPointValue(point),
    );

    if (this.compareEnabled() && equipmentComparisonData.length > 0) {
      datasets.push({
        label: 'Equipment Previous Period',
        data: equipmentComparisonData,
        backgroundColor: '#c4b5fd',
        hoverBackgroundColor: '#a78bfa',
      });
    }

    if (this.compareEnabled() && facilityComparisonData.length > 0) {
      datasets.push({
        label: 'Facilities Previous Period',
        data: facilityComparisonData,
        backgroundColor: '#99f6e4',
        hoverBackgroundColor: '#5eead4',
      });
    }

    return {
      labels: [...aligned.labels],
      datasets,
    };
  });

  /**
   * Property chartOptions
   * @readonly
   *
   * @description
   * Reactive Chart.js options for the asset growth grouped bar chart.
   * Recomputes on each render cycle to allow dynamic theming.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<ChartOptions<'bar'>>}
   */
  protected readonly chartOptions: Signal<ChartOptions<'bar'>> = computed(() => ({
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
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          title: (items) => items[0]?.label ?? '',
          label: (item) => ` ${item.dataset.label}: ${item.formattedValue}`,
        },
      },
    },
    scales: {
      x: {
        border: { display: false },
        grid: { display: false },
        ticks: { display: false },
      },
      y: {
        border: { display: false },
        beginAtZero: true,
        grid: { color: 'rgba(0, 0, 0, 0.06)' },
        ticks: { precision: 0, maxTicksLimit: 5 },
      },
    },
  }));

  /**
   * Method onGranularityChange
   *
   * @description
   * Updates the selected granularity signal, triggering a resource reload.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {OrganizationDashboardGranularity} granularity - The newly selected granularity.
   * @returns {void}
   */
  protected onGranularityChange(granularity: OrganizationDashboardGranularity): void {
    this.selectedGranularity.set(granularity);
  }

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
    this.menu().toggle(event);
  }

  /**
   * Method formatWholeNumber
   *
   * @description
   * Formats a number as a whole en-US integer string.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {number} value - The number to format.
   * @returns {string} The formatted string.
   */
  private formatWholeNumber(value: number): string {
    return this.wholeNumberFormatter.format(value);
  }

  /**
   * Method buildComparison
   *
   * @description
   * Builds an {@link OrganizationDashboardMetricCardComparison} from a
   * current and previous period total. Returns null when compare mode
   * is disabled, and uses direction `null` for a flat (zero-delta) result.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {number} current - Current-period total.
   * @param {number} previous - Previous-period total.
   * @returns {OrganizationDashboardMetricCardComparison | null}
   */
  private buildComparison(
    current: number,
    previous: number,
  ): OrganizationDashboardMetricCardComparison | null {
    if (!this.compareEnabled()) return null;

    const delta = current - previous;

    if (delta === 0) return { value: 'Flat', direction: null };

    return {
      value: `${delta > 0 ? '+' : ''}${this.formatWholeNumber(delta)}`,
      direction: delta > 0 ? 'up' : 'down',
    };
  }
}
