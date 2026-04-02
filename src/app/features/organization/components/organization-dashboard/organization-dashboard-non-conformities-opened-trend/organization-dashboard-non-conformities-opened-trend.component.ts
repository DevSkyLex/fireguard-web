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
import { ToggleButtonModule } from 'primeng/togglebutton';
import { PrimeIcons } from 'primeng/api';
import type { MenuItem } from 'primeng/api';
import { Card } from '@shared/components';
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
 * Component OrganizationDashboardNonConformitiesOpenedTrend
 * @class OrganizationDashboardNonConformitiesOpenedTrend
 *
 * @description
 * Dumb component that displays a line chart of the opened non-conformities trend.
 * Receives trend data and loading state via signal inputs and emits
 * period change events so the parent can reload the data accordingly.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-dashboard-non-conformities-opened-trend',
  templateUrl: './organization-dashboard-non-conformities-opened-trend.component.html',
  imports: [Card, FormsModule, ButtonModule, ChartModule, MenuModule, SkeletonModule, SelectModule, ToggleButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationDashboardNonConformitiesOpenedTrend {
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
   * Reactive resource that automatically fetches the opened non-conformities trend
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

      return {
        organizationId: organization.id,
        granularity: this.selectedGranularity(),
        from: this.selectedFrom() ?? undefined,
        to: this.selectedTo() ?? undefined,
        compare: this.compareEnabled() || undefined,
        nonConformityStatus: this.selectedNonConformityStatus() ?? undefined,
        nonConformitySeverity: this.selectedNonConformitySeverity() ?? undefined,
      };
    },
    stream: ({ params }: { params: OrganizationDashboardNonConformityTrendResourceParams }) =>
      this.organizationService.getDashboardNonConformitiesOpenedTrend(
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
   *  value: OrganizationDashboardGranularity
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

  protected readonly selectedFrom: WritableSignal<string | null> = signal<string | null>(null);

  protected readonly selectedTo: WritableSignal<string | null> = signal<string | null>(null);

  protected readonly compareEnabled: WritableSignal<boolean> = signal<boolean>(false);

  protected readonly nonConformityStatusOptions: { label: string; value: NonConformityStatus }[] = [
    { label: 'Open', value: 'open' },
    { label: 'In Progress', value: 'in_progress' },
    { label: 'Done', value: 'done' },
    { label: 'Waived', value: 'waived' },
  ];

  protected readonly selectedNonConformityStatus: WritableSignal<NonConformityStatus | null> =
    signal<NonConformityStatus | null>(null);

  protected readonly nonConformitySeverityOptions: { label: string; value: NonConformitySeverity }[] = [
    { label: 'Low', value: 'low' },
    { label: 'Medium', value: 'medium' },
    { label: 'High', value: 'high' },
    { label: 'Critical', value: 'critical' },
  ];

  protected readonly selectedNonConformitySeverity: WritableSignal<NonConformitySeverity | null> =
    signal<NonConformitySeverity | null>(null);

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

    const labels: string[] =
      trend?.series.map((point) => String(point['date'] ?? point['label'] ?? point['from'] ?? '')) ?? [];

    const data: number[] =
      trend?.series.map((point) => Number(point['count'] ?? point['total'] ?? point['value'] ?? 0)) ?? [];

    const comparisonSeries: readonly OrganizationDashboardTrendSeriesPoint[] =
      trend?.comparison?.series ?? [];
    const comparisonData: number[] =
      comparisonSeries.map((point) => Number(point['count'] ?? point['total'] ?? point['value'] ?? 0));

    const datasets: ChartData<'line'>['datasets'] = [
      {
        label: 'Non-Conformities Opened',
        data: data,
        fill: true,
        borderColor: '#f97316',
        backgroundColor: (context: ScriptableContext<'line'>) => {
          const { ctx, chartArea } = context.chart;
          if (!chartArea) return 'transparent';
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, 'rgba(249, 115, 22, 0.35)');
          gradient.addColorStop(1, 'rgba(249, 115, 22, 0.0)');
          return gradient;
        },
        tension: 0.4,
        pointBackgroundColor: '#f97316',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 7,
        pointHoverBorderWidth: 2,
      },
    ];

    if (comparisonData.length > 0) {
      datasets.push({
        label: 'Previous Period',
        data: comparisonData,
        fill: false,
        borderColor: 'rgba(249, 115, 22, 0.4)',
        borderDash: [5, 5],
        backgroundColor: 'transparent',
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 5,
        pointBackgroundColor: 'rgba(249, 115, 22, 0.4)',
        pointBorderColor: '#fff',
        pointBorderWidth: 1,
      });
    }

    return { labels, datasets };
  });

  /**
   * Property chartOptions
   * @readonly
   *
   * @description
   * Static chart.js options for the opened non-conformities line chart.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {ChartOptions<'line'>}
   */
  protected readonly chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 400 },
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (item) => ` ${item.dataset.label}: ${item.formattedValue}`,
        },
      },
    },
    scales: {
      x: {
        border: { display: false },
        grid: { display: false },
        ticks: { maxRotation: 0, maxTicksLimit: 6 },
      },
      y: {
        border: { display: false },
        beginAtZero: true,
        grid: { color: 'rgba(0, 0, 0, 0.06)' },
        ticks: { precision: 0, maxTicksLimit: 5 },
      },
    },
  };
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
