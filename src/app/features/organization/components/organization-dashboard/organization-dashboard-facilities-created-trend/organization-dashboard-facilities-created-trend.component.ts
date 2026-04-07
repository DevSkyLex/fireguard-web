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
import { Menu, MenuModule } from 'primeng/menu';
import { SkeletonModule } from 'primeng/skeleton';
import { SelectModule } from 'primeng/select';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { DatePickerModule } from 'primeng/datepicker';
import { ToggleButtonModule } from 'primeng/togglebutton';
import { PrimeIcons } from 'primeng/api';
import type { MenuItem } from 'primeng/api';
import { TrendCard } from '@shared/components';
import { OrganizationService } from '@core/services/api/organization';
import { ActiveOrganizationStore } from '@core/stores/organization';
import type {
  OrganizationDashboardFacilityTrendResourceParams,
  OrganizationDashboardGranularity,
  OrganizationDashboardTrendOutput,
  OrganizationDashboardTrendSeriesPoint,
  OrganizationOutput,
} from '@core/models/organization';
import type { FacilityType } from '@core/models/facility';
import type { ChartData, ChartOptions } from 'chart.js';

/**
 * Component OrganizationDashboardFacilitiesCreatedTrend
 * @class OrganizationDashboardFacilitiesCreatedTrend
 *
 * @description
 * Smart component that displays a bar chart of facilities created over time.
 * Fetches the facilities-created trend from the organization dashboard API,
 * supports granularity selection, date range filtering, facility type filtering,
 * and optional period comparison.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-dashboard-facilities-created-trend',
  templateUrl: './organization-dashboard-facilities-created-trend.component.html',
  imports: [TrendCard, FormsModule, ButtonModule, ChartModule, MenuModule, SkeletonModule, SelectModule, InputGroupModule, InputGroupAddonModule, ToggleButtonModule, DatePickerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationDashboardFacilitiesCreatedTrend {
  //#region Properties
  /**
   * Property organizationService
   * @readonly
   *
   * @description
   * Angular service used to fetch trend data from the API.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {OrganizationService}
   */
  private readonly organizationService: OrganizationService = inject(OrganizationService);

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
  private readonly activeOrganizationStore: InstanceType<typeof ActiveOrganizationStore> =
    inject(ActiveOrganizationStore);

  /**
   * Property trendResource
   * @readonly
   *
   * @description
   * Reactive resource that automatically fetches the facilities-created trend
   * whenever the active organization or selected filters change.
   * Stays idle when no organization is selected.
   * Automatically cancels any in-flight request when inputs change.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {ResourceRef<OrganizationDashboardTrendOutput | undefined>}
   */
  protected readonly trendResource: ResourceRef<OrganizationDashboardTrendOutput | undefined> = rxResource<OrganizationDashboardTrendOutput, OrganizationDashboardFacilityTrendResourceParams | undefined>({
    params: () => {
      const organization: OrganizationOutput | null =
        this.activeOrganizationStore.selectedOrganization();

      if (!organization) return undefined;

      const toISO = (d: Date | undefined): string | undefined => d?.toISOString();
      const range: Date[] | null = this.selectedDateRange();

      return {
        organizationId: organization.id,
        granularity: this.selectedGranularity(),
        from: toISO(range?.[0]),
        to: toISO(range?.[1]),
        compare: this.compareEnabled() || undefined,
        facilityType: this.selectedFacilityType() ?? undefined,
      };
    },
    stream: ({ params }: { params: OrganizationDashboardFacilityTrendResourceParams }) =>
      this.organizationService.getDashboardFacilitiesCreatedTrend(
        params.organizationId,
        {
          granularity: params.granularity,
          from: params.from,
          to: params.to,
          compare: params.compare,
          facilityType: params.facilityType,
        },
      ),
  });

  /**
   * Property menuItems
   * @readonly
   *
   * @description
   * Navigation menu items displayed in the ellipsis popup menu.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<MenuItem[]>}
   */
  protected readonly menuItems: Signal<MenuItem[]> = computed<MenuItem[]>(() => {
    const organizationId: string | undefined =
      this.activeOrganizationStore.selectedOrganization()?.id;

    return [
      {
        label: 'View all facilities',
        icon: PrimeIcons.LIST,
        routerLink: organizationId ? ['/organizations', organizationId, 'facilities'] : null,
      },
    ];
  });

  /**
   * Property menu
   * @readonly
   *
   * @description
   * Reference to the PrimeNG Menu component used to toggle the popup.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Signal<Menu>}
   */
  private readonly menu: Signal<Menu> =
    viewChild.required<Menu>('actionMenu');

  /**
   * Property granularityOptions
   * @readonly
   *
   * @description
   * Available granularity options for the period selector.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {{ label: string; value: OrganizationDashboardGranularity }[]}
   */
  protected readonly granularityOptions: { label: string; value: OrganizationDashboardGranularity }[] = [
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
   * The currently selected date range for the chart.
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
   * Whether the comparison mode is active.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly compareEnabled: WritableSignal<boolean> = signal<boolean>(true);

  /**
   * Property facilityTypeOptions
   * @readonly
   *
   * @description
   * Available filter options for facility type.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {{ label: string; value: FacilityType; icon: string }[]}
   */
  protected readonly facilityTypeOptions: { label: string; value: FacilityType; icon: string }[] = [
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
   * The currently selected facility type filter.
   * Null means no filter is applied.
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
   * The full option object matching the currently selected facility type,
   * used to render the icon in the selected item template.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<{ label: string; value: FacilityType; icon: string } | null>}
   */
  protected readonly selectedFacilityTypeOption = computed(() =>
    this.facilityTypeOptions.find(o => o.value === this.selectedFacilityType()) ?? null,
  );

  /**
   * Property chartData
   * @readonly
   *
   * @description
   * Reactive chart.js data derived from the trend resource.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<ChartData<'bar'>>}
   */
  protected readonly chartData: Signal<ChartData<'bar'>> = computed<ChartData<'bar'>>(() => {
    const trend: OrganizationDashboardTrendOutput | null = this.trendResource.value() ?? null;
    const granularity = this.selectedGranularity();

    const formatLabel = (point: OrganizationDashboardTrendSeriesPoint): string => {
      const raw = String(point['bucket'] ?? point['date'] ?? point['label'] ?? point['from'] ?? '');
      if (!raw) return '';
      const weekMatch = raw.match(/^(\d{4})-W(\d{2})$/);
      if (weekMatch) {
        const year = parseInt(weekMatch[1], 10);
        const week = parseInt(weekMatch[2], 10);
        const jan4 = new Date(year, 0, 4);
        const dow = (jan4.getDay() + 6) % 7;
        const weekStart = new Date(year, 0, 4 - dow + (week - 1) * 7);
        const weekEnd = new Date(year, 0, 4 - dow + (week - 1) * 7 + 6);
        const fromStr = weekStart.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
        const toStr = weekEnd.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
        return `${fromStr} – ${toStr}`;
      }
      const monthMatch = raw.match(/^(\d{4})-(\d{2})$/);
      const dayMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
      let date: Date;
      if (monthMatch) {
        date = new Date(parseInt(monthMatch[1], 10), parseInt(monthMatch[2], 10) - 1, 1);
      } else if (dayMatch) {
        date = new Date(parseInt(dayMatch[1], 10), parseInt(dayMatch[2], 10) - 1, parseInt(dayMatch[3], 10));
      } else {
        date = new Date(raw);
      }
      if (isNaN(date.getTime())) return raw;
      if (granularity === 'month') return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      if (granularity === 'week') {
        const weekEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 6);
        const fromStr = date.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
        const toStr = weekEnd.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
        return `${fromStr} – ${toStr}`;
      }
      return date.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const labels: string[] = trend?.series.map(formatLabel) ?? [];
    const data: number[] = trend?.series.map((point) => Number(point['count'] ?? point['total'] ?? point['value'] ?? 0)) ?? [];

    const comparisonSeries: readonly OrganizationDashboardTrendSeriesPoint[] = trend?.comparison?.series ?? [];
    const comparisonData: number[] = comparisonSeries.map((point) => Number(point['count'] ?? point['total'] ?? point['value'] ?? 0));

    const datasets: ChartData<'bar'>['datasets'] = [
      {
        label: 'Facilities Created',
        data,
        backgroundColor: '#14b8a6',
        hoverBackgroundColor: '#0d9488',
      },
    ];

    if (this.compareEnabled() && comparisonData.length > 0) {
      datasets.push({
        label: 'Previous Period',
        data: comparisonData,
        backgroundColor: '#99f6e4',
        hoverBackgroundColor: '#5eead4',
      });
    }

    return { labels, datasets };
  });

  /**
   * Property chartOptions
   * @readonly
   *
   * @description
   * Reactive chart.js options for the facilities-created bar chart.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<ChartOptions<'bar'>>}
   */
  protected readonly chartOptions: Signal<ChartOptions<'bar'>> = computed<ChartOptions<'bar'>>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 500 },
    interaction: { mode: 'index', intersect: false },
    datasets: {
      bar: {
        barPercentage: 0.65,
        categoryPercentage: 0.8,
        borderRadius: 6,
        borderSkipped: 'start',
        borderWidth: 0,
      },
    },
    plugins: {
      legend: {
        display: this.compareEnabled(),
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
  //#endregion

  //#region Methods
  /**
   * Method onGranularityChange
   *
   * @description
   * Updates the selected granularity signal.
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
  //#endregion
}
