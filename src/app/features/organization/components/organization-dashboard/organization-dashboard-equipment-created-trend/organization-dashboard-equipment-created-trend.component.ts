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
  OrganizationDashboardEquipmentTrendResourceParams,
  OrganizationDashboardEquipmentType,
  OrganizationDashboardEquipmentStatus,
  OrganizationDashboardGranularity,
  OrganizationDashboardTrendOutput,
  OrganizationDashboardTrendSeriesPoint,
  OrganizationOutput,
} from '@core/models/organization';
import type { ChartData, ChartOptions } from 'chart.js';

/**
 * Component OrganizationDashboardEquipmentCreatedTrend
 * @class OrganizationDashboardEquipmentCreatedTrend
 *
 * @description
 * Smart component that displays a bar chart of equipment created over time.
 * Fetches the equipment-created trend from the organization dashboard API,
 * supports granularity selection, date range filtering, status/type filtering,
 * and optional period comparison.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-dashboard-equipment-created-trend',
  templateUrl: './organization-dashboard-equipment-created-trend.component.html',
  imports: [TrendCard, FormsModule, ButtonModule, ChartModule, MenuModule, SkeletonModule, SelectModule, InputGroupModule, InputGroupAddonModule, ToggleButtonModule, DatePickerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationDashboardEquipmentCreatedTrend {
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
   * Reactive resource that automatically fetches the equipment-created trend
   * whenever the active organization or selected filters change.
   * Stays idle when no organization is selected.
   * Automatically cancels any in-flight request when inputs change.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {ResourceRef<OrganizationDashboardTrendOutput | undefined>}
   */
  protected readonly trendResource: ResourceRef<OrganizationDashboardTrendOutput | undefined> = rxResource<OrganizationDashboardTrendOutput, OrganizationDashboardEquipmentTrendResourceParams | undefined>({
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
        equipmentType: this.selectedEquipmentType() ?? undefined,
        equipmentStatus: this.selectedEquipmentStatus() ?? undefined,
      };
    },
    stream: ({ params }: { params: OrganizationDashboardEquipmentTrendResourceParams }) =>
      this.organizationService.getDashboardEquipmentCreatedTrend(
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
        label: 'View all equipment',
        icon: PrimeIcons.LIST,
        routerLink: organizationId ? ['/organizations', organizationId, 'equipment'] : null,
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
  private readonly menu: Signal<Menu> = viewChild.required<Menu>('actionMenu');

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
    signal<OrganizationDashboardGranularity>('week');

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
   * Property maxRangeDays
   * @readonly
   *
   * @description
   * Maximum selectable date range in days based on the current granularity.
   * Daily: 90 days — Weekly: 365 days — Monthly: 730 days.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<number>}
   */
  protected readonly maxRangeDays: Signal<number> = computed<number>(() => {
    switch (this.selectedGranularity()) {
      case 'day': return 90;
      case 'month': return 730;
      default: return 365;
    }
  });

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
   * Property equipmentTypeOptions
   * @readonly
   *
   * @description
   * Available filter options for equipment type.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {{ label: string; value: OrganizationDashboardEquipmentType }[]}
   */
  protected readonly equipmentTypeOptions: { label: string; value: OrganizationDashboardEquipmentType }[] = [
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
   * The currently selected equipment type filter.
   * Null means no filter is applied.
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
   * @readonly
   *
   * @description
   * Available filter options for equipment status.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {{ label: string; value: OrganizationDashboardEquipmentStatus; icon: string; color: string }[]}
   */
  protected readonly equipmentStatusOptions: { label: string; value: OrganizationDashboardEquipmentStatus; icon: string; color: string }[] = [
    { label: 'In Stock', value: 'in_stock', icon: 'pi pi-box', color: '#94a3b8' },
    { label: 'Operational', value: 'operational', icon: 'pi pi-check-circle', color: '#22c55e' },
    { label: 'Under Maintenance', value: 'under_maintenance', icon: 'pi pi-wrench', color: '#f97316' },
    { label: 'Decommissioned', value: 'decommissioned', icon: 'pi pi-ban', color: '#ef4444' },
  ];

  /**
   * Property selectedEquipmentStatus
   * @readonly
   *
   * @description
   * The currently selected equipment status filter.
   * Null means no filter is applied.
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
   * The full option object matching the currently selected equipment
   * status, used to render the icon and color in the selected item template.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<{ label: string; value: OrganizationDashboardEquipmentStatus; icon: string; color: string } | null>}
   */
  protected readonly selectedEquipmentStatusOption = computed(() =>
    this.equipmentStatusOptions.find(o => o.value === this.selectedEquipmentStatus()) ?? null,
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
        label: 'Equipment Created',
        data,
        backgroundColor: '#8b5cf6',
        hoverBackgroundColor: '#7c3aed',
      },
    ];

    if (this.compareEnabled() && comparisonData.length > 0) {
      datasets.push({
        label: 'Previous Period',
        data: comparisonData,
        backgroundColor: '#c4b5fd',
        hoverBackgroundColor: '#a78bfa',
      });
    }

    return { labels, datasets };
  });

  /**
   * Property chartOptions
   * @readonly
   *
   * @description
   * Reactive chart.js options for the equipment-created bar chart.
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
      x: {
        border: { display: false },
        grid: { display: false },
        ticks: { display: false },
      },
      y: {
        border: { display: false },
        beginAtZero: true,
        grid: { color: 'rgba(0, 0, 0, 0.04)', drawTicks: false },
        ticks: { precision: 0, maxTicksLimit: 5, color: '#94a3b8', font: { size: 11 }, padding: 8 },
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
  protected onDateRangeChange(range: Date[] | null): void {
    if (!range || range.length < 2 || !range[0] || !range[1]) {
      this.selectedDateRange.set(range);
      return;
    }
    const [from, to] = range;
    const maxMs = this.maxRangeDays() * 24 * 60 * 60 * 1000;
    if (to.getTime() - from.getTime() > maxMs) {
      this.selectedDateRange.set([from, new Date(from.getTime() + maxMs)]);
    } else {
      this.selectedDateRange.set(range);
    }
  }

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
