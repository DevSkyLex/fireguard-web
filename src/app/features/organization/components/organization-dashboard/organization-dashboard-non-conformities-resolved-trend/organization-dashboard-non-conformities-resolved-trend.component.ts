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
  OrganizationDashboardGranularity,
  OrganizationDashboardNonConformityTrendResourceParams,
  OrganizationDashboardTrendOutput,
  OrganizationDashboardTrendSeriesPoint,
  OrganizationOutput,
} from '@core/models/organization';
import type {
  NonConformitySeverity,
  NonConformityStatus,
} from '@core/models/inspection';
import type { ChartData, ChartOptions, ScriptableContext } from 'chart.js';

/**
 * Component OrganizationDashboardNonConformitiesResolvedTrend
 * @class OrganizationDashboardNonConformitiesResolvedTrend
 *
 * @description
 * Dumb component that displays a line chart of the resolved non-conformities trend.
 * Receives trend data and loading state via signal inputs and emits
 * period change events so the parent can reload the data accordingly.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-dashboard-non-conformities-resolved-trend',
  templateUrl: './organization-dashboard-non-conformities-resolved-trend.component.html',
  imports: [TrendCard, FormsModule, ButtonModule, ChartModule, MenuModule, SkeletonModule, SelectModule, InputGroupModule, InputGroupAddonModule, ToggleButtonModule, DatePickerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationDashboardNonConformitiesResolvedTrend {
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
   * Reactive resource that automatically fetches the resolved non-conformities trend
   * whenever the active organization or selected granularity changes.
   * Stays idle when no organization is selected.
   * Automatically cancels any in-flight request when inputs change.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {ResourceRef<OrganizationDashboardTrendOutput | undefined>}
   */
  protected readonly trendResource: ResourceRef<OrganizationDashboardTrendOutput | undefined> = rxResource<OrganizationDashboardTrendOutput, OrganizationDashboardNonConformityTrendResourceParams | undefined>({
    params: () => {
      /**
       * Constant organization
       * @const organization
       *
       * @description
       * Locally scoped constant to hold the currently
       * selected organization.
       *
       * @type {OrganizationOutput | null}
       */
      const organization: OrganizationOutput | null =
        this.activeOrganizationStore.selectedOrganization();

      // If no organization is selected, return undefined to keep the resource idle
      if (!organization) return undefined;

      const toISO = (d: Date | undefined): string | undefined => d?.toISOString();

      const range: Date[] | null = this.selectedDateRange();

      return {
        organizationId: organization.id,
        granularity: this.selectedGranularity(),
        from: toISO(range?.[0]),
        to: toISO(range?.[1]),
        compare: this.compareEnabled() || undefined,
        nonConformityStatus: this.selectedNonConformityStatus() ?? undefined,
        nonConformitySeverity: this.selectedNonConformitySeverity() ?? undefined,
      };
    },
    stream: ({ params }: { params: OrganizationDashboardNonConformityTrendResourceParams }) =>
      this.organizationService.getDashboardNonConformitiesResolvedTrend(
        params.organizationId,
        {
          granularity: params.granularity,
          from: params.from,
          to: params.to,
          compare: params.compare,
          nonConformityStatus: params.nonConformityStatus,
          nonConformitySeverity: params.nonConformitySeverity,
        },
      ),
  });

  /**
   * Property menuItems
   * @readonly
   *
   * @description
   * Navigation menu items displayed in the ellipsis popup menu.
   * Derived from the active organization identifier.
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
        label: 'View all inspections',
        icon: PrimeIcons.LIST,
        routerLink: organizationId ? ['/organizations', organizationId, 'inspections'] : null,
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
   * @type {{
   *  label: string;
   *  value: OrganizationDashboardGranularity;
   * }[]}
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
   * When set, both from and to are forwarded to the API as ISO 8601
   * datetime strings. Null means no date filter is applied.
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
   * Whether the comparison mode is active. When true, the API
   * returns a second series for the previous equivalent period
   * and the chart renders a second semi-transparent dataset.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly compareEnabled: WritableSignal<boolean> = signal<boolean>(true);

  /**
   * Property nonConformityStatusOptions
   * @readonly
   *
   * @description
   * Available filter options for non-conformity status.
   * Each option carries a label, a typed value, a PrimeIcons icon
   * class and a hex color used to tint the icon in the select.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {{ label: string; value: NonConformityStatus; icon: string; color: string }[]}
   */
  protected readonly nonConformityStatusOptions: { label: string; value: NonConformityStatus; icon: string; color: string }[] = [
    { label: 'Open', value: 'open', icon: 'pi pi-circle', color: '#ef4444' },
    { label: 'In Progress', value: 'in_progress', icon: 'pi pi-refresh', color: '#f97316' },
    { label: 'Done', value: 'done', icon: 'pi pi-check-circle', color: '#22c55e' },
    { label: 'Waived', value: 'waived', icon: 'pi pi-ban', color: '#94a3b8' },
  ];

  /**
   * Property selectedNonConformityStatus
   * @readonly
   *
   * @description
   * The currently selected non-conformity status filter.
   * Null means no filter is applied.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<NonConformityStatus | null>}
   */
  protected readonly selectedNonConformityStatus: WritableSignal<NonConformityStatus | null> =
    signal<NonConformityStatus | null>(null);

  /**
   * Property selectedNonConformityStatusOption
   * @readonly
   *
   * @description
   * The full option object matching the currently selected non-conformity
   * status, used to render the icon and color in the selected item template.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<{ label: string; value: NonConformityStatus; icon: string; color: string } | null>}
   */
  protected readonly selectedNonConformityStatusOption = computed(() =>
    this.nonConformityStatusOptions.find(o => o.value === this.selectedNonConformityStatus()) ?? null
  );

  /**
   * Property nonConformitySeverityOptions
   * @readonly
   *
   * @description
   * Available filter options for non-conformity severity.
   * Each option carries a label, a typed value and a hex color
   * used to render the colored dot in the select.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {{ label: string; value: NonConformitySeverity; color: string }[]}
   */
  protected readonly nonConformitySeverityOptions: { label: string; value: NonConformitySeverity; color: string }[] = [
    { label: 'Low', value: 'low', color: '#22c55e' },
    { label: 'Medium', value: 'medium', color: '#eab308' },
    { label: 'High', value: 'high', color: '#f97316' },
    { label: 'Critical', value: 'critical', color: '#ef4444' },
  ];

  /**
   * Property selectedNonConformitySeverity
   * @readonly
   *
   * @description
   * The currently selected non-conformity severity filter.
   * Null means no filter is applied.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<NonConformitySeverity | null>}
   */
  protected readonly selectedNonConformitySeverity: WritableSignal<NonConformitySeverity | null> =
    signal<NonConformitySeverity | null>(null);

  /**
   * Property selectedSeverityOption
   * @readonly
   *
   * @description
   * The full option object matching the currently selected severity,
   * used to render the colored dot in the selected item template.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<{ label: string; value: NonConformitySeverity; color: string } | null>}
   */
  protected readonly selectedSeverityOption = computed(() =>
    this.nonConformitySeverityOptions.find(o => o.value === this.selectedNonConformitySeverity()) ?? null
  );

  /**
   * Property chartData
   * @readonly
   *
   * @description
   * Reactive chart.js data derived from the trend signal.
   * Automatically recomputes when the trend input changes.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<ChartData<'line'>>}
   */
  protected readonly chartData: Signal<ChartData<'line'>> = computed<ChartData<'line'>>(() => {
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

    const data: number[] =
      trend?.series.map((point) => Number(point['count'] ?? point['total'] ?? point['value'] ?? 0)) ?? [];

    const comparisonSeries: readonly OrganizationDashboardTrendSeriesPoint[] =
      trend?.comparison?.series ?? [];
    const comparisonData: number[] =
      comparisonSeries.map((point) => Number(point['count'] ?? point['total'] ?? point['value'] ?? 0));

    const datasets: ChartData<'line'>['datasets'] = [
      {
        label: 'Non-Conformities Resolved',
        data: data,
        borderColor: '#22c55e',
        backgroundColor: (context: ScriptableContext<'line'>): CanvasGradient | string => {
          const { ctx, chartArea } = context.chart;
          if (!chartArea) return 'rgba(34, 197, 94, 0)';
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, 'rgba(34, 197, 94, 0.25)');
          gradient.addColorStop(1, 'rgba(34, 197, 94, 0)');
          return gradient;
        },
        borderWidth: 2,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBorderWidth: 2,
        pointHoverBorderColor: '#fff',
        pointHoverBackgroundColor: '#22c55e',
        fill: 'origin',
      },
    ];

    if (this.compareEnabled() && comparisonData.length > 0) {
      datasets.push({
        label: 'Previous Period',
        data: comparisonData,
        borderColor: '#86efac',
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderDash: [4, 4],
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHoverBorderWidth: 2,
        pointHoverBorderColor: '#fff',
        pointHoverBackgroundColor: '#86efac',
        fill: false,
      });
    }

    return { labels, datasets };
  });

  /**
   * Property chartOptions
   * @readonly
   *
   * @description
   * Reactive chart.js options for the resolved non-conformities line chart.
   * The legend is shown only when the comparison mode is active.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<ChartOptions<'line'>>}
   */
  protected readonly chartOptions: Signal<ChartOptions<'line'>> = computed<ChartOptions<'line'>>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 500 },
    interaction: { mode: 'index', intersect: false },
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
   * Updates the selected granularity and emits a period change event
   * so the parent can reload the trend with the new options.
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
