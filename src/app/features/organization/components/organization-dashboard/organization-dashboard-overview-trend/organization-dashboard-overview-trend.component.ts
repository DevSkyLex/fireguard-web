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
import { forkJoin } from 'rxjs';
import { Card } from '@shared/components';
import { OrganizationDashboardMetricCard } from '../organization-dashboard-metric-card';
import type { OrganizationDashboardMetricCardComparison } from '../organization-dashboard-metric-card';
import { OrganizationService } from '@core/services/api/organization';
import { ActiveOrganizationStore } from '@core/stores/organization';
import type {
  OrganizationDashboardGranularity,
  OrganizationDashboardOverviewTrendResource,
  OrganizationDashboardTrendOutput,
  OrganizationDashboardTrendResourceParams,
  OrganizationOutput,
} from '@core/models/organization';
import type { ChartData, ChartOptions } from 'chart.js';
import {
  alignDashboardTrendSeries,
  buildDifferenceSeries,
  getDashboardTrendPointValue,
  sumDashboardTrendValues,
} from '../organization-dashboard-trend.utils';

/**
 * Type OrganizationDashboardOverviewSummaryMetric
 *
 * @description
 * Shape of a single KPI tile rendered above the operational flow chart.
 * Maps directly onto the inputs expected by
 * {@link OrganizationDashboardMetricCard}.
 */
type OrganizationDashboardOverviewSummaryMetric = {
  readonly label: string;
  readonly value: string;
  readonly icon: string | null;
  readonly comparison: OrganizationDashboardMetricCardComparison | null;
};

/**
 * Component OrganizationDashboardOverviewTrend
 * @class OrganizationDashboardOverviewTrend
 *
 * @description
 * Dumb component that displays a combined multi-dataset line chart of
 * inspections, opened non-conformities, and resolved non-conformities
 * trends on a single graph for a global activity overview.
 *
 * Receives all three trend datasets and a shared loading state via
 * signal inputs and emits a single period change event so the parent
 * can reload all three datasets simultaneously.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-dashboard-overview-trend',
  templateUrl: './organization-dashboard-overview-trend.component.html',
  imports: [
    Card,
    FormsModule,
    ButtonModule,
    ChartModule,
    MenuModule,
    OrganizationDashboardMetricCard,
    SkeletonModule,
    SelectModule,
    InputGroupModule,
    InputGroupAddonModule,
    ToggleButtonModule,
    DatePickerModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationDashboardOverviewTrend {
  //#region Properties
  private readonly wholeNumberFormatter = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  });

  /**
   * Property organizationService
   * @readonly
   *
   * @description
   * Angular service used to fetch all three trend datasets from the API.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {OrganizationService}
   */
  private readonly organizationService: OrganizationService =
    inject<OrganizationService>(OrganizationService);

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
   * Property overviewResource
   * @readonly
   *
   * @description
   * Reactive resource that fetches all three trend datasets in parallel
   * whenever the active organization or selected granularity changes.
   * Stays idle when no organization is selected.
   * Automatically cancels any in-flight request when inputs change.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {ResourceRef<{
   *  inspections: OrganizationDashboardTrendOutput;
   *  ncOpened: OrganizationDashboardTrendOutput;
   *  ncResolved: OrganizationDashboardTrendOutput;
   * } | undefined>}
   */
  protected readonly overviewResource: ResourceRef<OrganizationDashboardOverviewTrendResource | undefined> = rxResource<OrganizationDashboardOverviewTrendResource, OrganizationDashboardTrendResourceParams | undefined>({
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

      /**
       * Constant range
       * @const range
       *
       * @description
       * Locally scoped constant to hold the currently selected date range,
       * extracted from the corresponding signal for convenience.
       *
       * @type {Date[] | null}
       */
      const range: Date[] | null = this.selectedDateRange();

      return {
        organizationId: organization.id,
        granularity: this.selectedGranularity(),
        from: toISO(range?.[0]),
        to: toISO(range?.[1]),
        compare: this.compareEnabled() || undefined,
      };
    },
    stream: ({ params }: { params: OrganizationDashboardTrendResourceParams }) =>
      forkJoin({
        inspections: this.organizationService.getDashboardInspectionsTrend(
          params.organizationId,
          {
            granularity: params.granularity,
            from: params.from,
            to: params.to,
            compare: params.compare
          },
        ),
        ncOpened: this.organizationService.getDashboardNonConformitiesOpenedTrend(
          params.organizationId,
          {
            granularity: params.granularity,
            from: params.from,
            to: params.to,
            compare: params.compare
          },
        ),
        ncResolved: this.organizationService.getDashboardNonConformitiesResolvedTrend(
          params.organizationId,
          {
            granularity: params.granularity,
            from: params.from,
            to: params.to,
            compare: params.compare
          },
        ),
      }),
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
   * When set, both from and to are forwarded to the API as ISO 8601
   * datetime strings. Null means no date filter is applied.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<Date[] | null>}
   */
  protected readonly selectedDateRange: WritableSignal<Date[] | null> =
    signal<Date[] | null>([
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
  protected readonly compareEnabled: WritableSignal<boolean> =
    signal<boolean>(true);

  /**
   * Property summaryMetrics
   * @readonly
   *
   * @description
   * Four KPI tiles rendered above the chart: Inspections, Opened NC,
   * Resolved NC, and Net Pressure (opened − resolved).
   * Automatically recomputes when the resource value changes.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly OrganizationDashboardOverviewSummaryMetric[]>}
   */
  protected readonly summaryMetrics: Signal<readonly OrganizationDashboardOverviewSummaryMetric[]> = computed(() => {
    const result = this.overviewResource.value();
    const aligned = alignDashboardTrendSeries(
      [
        result?.inspections?.series,
        result?.ncOpened?.series,
        result?.ncResolved?.series,
      ],
      this.selectedGranularity(),
    );
    const [inspectionData = [], openedData = [], resolvedData = []] = aligned.datasets;
    const netPressureData = buildDifferenceSeries(openedData, resolvedData);
    const inspectionTotal = sumDashboardTrendValues(inspectionData);
    const openedTotal = sumDashboardTrendValues(openedData);
    const resolvedTotal = sumDashboardTrendValues(resolvedData);
    const netPressureTotal = sumDashboardTrendValues(netPressureData);
    const previousInspectionTotal = sumDashboardTrendValues(
      (result?.inspections?.comparison?.series ?? []).map((point) => getDashboardTrendPointValue(point)),
    );
    const previousOpenedTotal = sumDashboardTrendValues(
      (result?.ncOpened?.comparison?.series ?? []).map((point) => getDashboardTrendPointValue(point)),
    );
    const previousResolvedTotal = sumDashboardTrendValues(
      (result?.ncResolved?.comparison?.series ?? []).map((point) => getDashboardTrendPointValue(point)),
    );
    const previousNetPressure = previousOpenedTotal - previousResolvedTotal;

    return [
      {
        label: 'Inspections',
        value: this.formatWholeNumber(inspectionTotal),
        icon: 'pi pi-list-check',
        comparison: this.buildComparison(inspectionTotal, previousInspectionTotal),
      },
      {
        label: 'Opened NC',
        value: this.formatWholeNumber(openedTotal),
        icon: 'pi pi-exclamation-triangle',
        comparison: this.buildComparison(openedTotal, previousOpenedTotal),
      },
      {
        label: 'Resolved NC',
        value: this.formatWholeNumber(resolvedTotal),
        icon: 'pi pi-check-circle',
        comparison: this.buildComparison(resolvedTotal, previousResolvedTotal),
      },
      {
        label: 'Net Pressure',
        value: this.formatWholeNumber(netPressureTotal),
        icon: 'pi pi-gauge',
        comparison: this.buildComparison(netPressureTotal, previousNetPressure),
      },
    ];
  });

  /**
   * Property chartData
   * @readonly
   *
   * @description
   * Reactive multi-dataset chart.js data derived from all three trend
   * signals. Uses the first non-null series for the shared time-axis
   * labels, and maps each trend to its own colored dataset.
   * Automatically recomputes when any trend input changes.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<ChartData<'bar'>>}
   */
  protected readonly chartData: Signal<ChartData<'bar'>> = computed<ChartData<'bar'>>(() => {
    const result = this.overviewResource.value();
    const inspections: OrganizationDashboardTrendOutput | null = result?.inspections ?? null;
    const ncOpened: OrganizationDashboardTrendOutput | null = result?.ncOpened ?? null;
    const ncResolved: OrganizationDashboardTrendOutput | null = result?.ncResolved ?? null;
    const aligned = alignDashboardTrendSeries(
      [inspections?.series, ncOpened?.series, ncResolved?.series],
      this.selectedGranularity(),
    );
    const [inspectionData = [], openedData = [], resolvedData = []] = aligned.datasets;
    const netPressureData = buildDifferenceSeries(openedData, resolvedData);

    return {
      labels: [...aligned.labels],
      datasets: [
        {
          label: 'Inspections',
          data: inspectionData,
          backgroundColor: '#3b82f6',
          borderColor: '#3b82f6',
          borderWidth: 0,
          borderRadius: 6,
        },
        {
          label: 'NC Opened',
          data: openedData,
          backgroundColor: '#f97316',
          borderColor: '#f97316',
          borderWidth: 0,
          borderRadius: 6,
        },
        {
          label: 'NC Resolved',
          data: resolvedData,
          backgroundColor: '#22c55e',
          borderColor: '#22c55e',
          borderWidth: 0,
          borderRadius: 6,
        },
        {
          label: 'Net Pressure',
          data: netPressureData,
          backgroundColor: '#0f172a',
          borderColor: '#0f172a',
          borderWidth: 0,
          borderRadius: 6,
        },
      ],
    };
  });

  /**
   * Property chartOptions
   * @readonly
   *
   * @description
   * Static chart.js options for the overview multi-dataset bar chart.
   * The legend is displayed to distinguish the three datasets.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {ChartOptions<'bar'>}
   */
  protected readonly chartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 400 },
    interaction: { mode: 'index', intersect: false },
    datasets: {
      bar: {
        barPercentage: 0.72,
        categoryPercentage: 0.78,
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
  };
  //#endregion

  //#region Methods
  /**
   * Method onGranularityChange
   *
   * @description
   * Updates the selected granularity and emits a period change event
   * so the parent can reload all three trends with the new options.
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
  //#endregion
}
