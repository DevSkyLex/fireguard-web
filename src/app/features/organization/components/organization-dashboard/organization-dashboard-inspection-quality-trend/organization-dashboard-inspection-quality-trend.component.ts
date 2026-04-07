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
import { Card } from '@shared/components';
import { OrganizationDashboardMetricCard } from '../organization-dashboard-metric-card';
import type { OrganizationDashboardMetricCardComparison } from '../organization-dashboard-metric-card';
import { OrganizationService } from '@core/services/api/organization';
import { ActiveOrganizationStore } from '@core/stores/organization';
import type {
  OrganizationDashboardGranularity,
  OrganizationDashboardTrendOutput,
  OrganizationDashboardTrendResourceParams,
  OrganizationOutput,
} from '@core/models/organization';
import type {
  InspectionResult,
  InspectionStatus,
  InspectorType,
  NonConformitySeverity,
} from '@core/models/inspection';
import {
  alignDashboardTrendSeries,
  buildPercentageSeries,
  getDashboardTrendPointValue,
  sumDashboardTrendValues,
} from '../organization-dashboard-trend.utils';

type OrganizationDashboardInspectionQualityResource = {
  readonly inspections: OrganizationDashboardTrendOutput;
  readonly ncOpened: OrganizationDashboardTrendOutput;
};

type OrganizationDashboardInspectionQualityParams =
  OrganizationDashboardTrendResourceParams & {
    readonly inspectionStatus?: InspectionStatus;
    readonly inspectionResult?: InspectionResult;
    readonly inspectorType?: InspectorType;
    readonly nonConformitySeverity?: NonConformitySeverity;
  };

/**
 * Type OrganizationDashboardInspectionQualitySummaryMetric
 *
 * @description
 * Shape of a single KPI tile rendered above the inspection quality chart.
 * Maps directly onto the inputs expected by
 * {@link OrganizationDashboardMetricCard}.
 */
type OrganizationDashboardInspectionQualitySummaryMetric = {
  readonly label: string;
  readonly value: string;
  readonly icon: string | null;
  readonly comparison: OrganizationDashboardMetricCardComparison | null;
};

/**
 * Component OrganizationDashboardInspectionQualityTrend
 * @class OrganizationDashboardInspectionQualityTrend
 *
 * @description
 * Standalone dashboard card that juxtaposes inspection throughput against
 * opened non-conformity pressure as a combined grouped bar chart.
 *
 * Fetches both trend datasets in parallel via {@link rxResource} and
 * `forkJoin`, aligns them onto a shared time axis using
 * {@link alignDashboardTrendSeries}, and exposes four KPI tiles
 * (Inspections, Opened NC, NC Rate, Rate Shift) above the chart.
 *
 * Supports granularity selection, optional date-range filtering,
 * optional previous-period comparison overlay, and per-dimension
 * inspection status/result, inspector type, and NC severity filters.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-dashboard-inspection-quality-trend',
  templateUrl: './organization-dashboard-inspection-quality-trend.component.html',
  imports: [
    Card,
    FormsModule,
    ButtonModule,
    ChartModule,
    DatePickerModule,
    InputGroupAddonModule,
    InputGroupModule,
    MenuModule,
    OrganizationDashboardMetricCard,
    SelectModule,
    SkeletonModule,
    ToggleButtonModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationDashboardInspectionQualityTrend {
  /**
   * Property organizationService
   * @readonly
   *
   * @description
   * Angular service used to fetch inspection and NC trend datasets.
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
   * Property percentFormatter
   * @readonly
   *
   * @description
   * Formats percentage values with one decimal place.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Intl.NumberFormat}
   */
  private readonly percentFormatter = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 1,
  });

  /**
   * Property qualityResource
   * @readonly
   *
   * @description
   * Reactive resource that fetches inspections-trend and NC-opened-trend
   * datasets in parallel via `forkJoin` whenever the active organization,
   * granularity, date range, compare flag, or dimension filters change.
   * Stays idle when no organization is selected.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {ResourceRef<OrganizationDashboardInspectionQualityResource | undefined>}
   */
  protected readonly qualityResource: ResourceRef<OrganizationDashboardInspectionQualityResource | undefined> = rxResource<OrganizationDashboardInspectionQualityResource, OrganizationDashboardInspectionQualityParams | undefined>({
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
        inspectionStatus: this.selectedInspectionStatus() ?? undefined,
        inspectionResult: this.selectedInspectionResult() ?? undefined,
        inspectorType: this.selectedInspectorType() ?? undefined,
        nonConformitySeverity: this.selectedNonConformitySeverity() ?? undefined,
      };
    },
    stream: ({ params }: { params: OrganizationDashboardInspectionQualityParams }) =>
      forkJoin({
        inspections: this.organizationService.getDashboardInspectionsTrend(
          params.organizationId,
          {
            granularity: params.granularity,
            from: params.from,
            to: params.to,
            compare: params.compare,
            inspectionStatus: params.inspectionStatus,
            inspectionResult: params.inspectionResult,
            inspectorType: params.inspectorType,
          },
        ),
        ncOpened: this.organizationService.getDashboardNonConformitiesOpenedTrend(
          params.organizationId,
          {
            granularity: params.granularity,
            from: params.from,
            to: params.to,
            compare: params.compare,
            nonConformitySeverity: params.nonConformitySeverity,
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
        label: 'View all inspections',
        icon: PrimeIcons.LIST,
        routerLink: organizationId
          ? ['/organizations', organizationId, 'inspections']
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
   * Property inspectionStatusOptions
   *
   * @description
   * Selectable inspection status filter options, each with an icon and color.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {{ label: string; value: InspectionStatus; icon: string; color: string }[]}
   */
  protected inspectionStatusOptions: {
    label: string;
    value: InspectionStatus;
    icon: string;
    color: string;
  }[] = [
    { label: 'Draft', value: 'draft', icon: 'pi pi-file-edit', color: '#94a3b8' },
    { label: 'Submitted', value: 'submitted', icon: 'pi pi-send', color: '#3b82f6' },
    { label: 'Closed', value: 'closed', icon: 'pi pi-lock', color: '#22c55e' },
  ];
  /**
   * Property selectedInspectionStatus
   * @readonly
   *
   * @description
   * The currently selected inspection status filter, or null for all statuses.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<InspectionStatus | null>}
   */
  protected readonly selectedInspectionStatus: WritableSignal<InspectionStatus | null> =
    signal<InspectionStatus | null>(null);

  /**
   * Property selectedInspectionStatusOption
   * @readonly
   *
   * @description
   * Derived option object matching {@link selectedInspectionStatus},
   * used to render the custom selected-item template in the status
   * dropdown (icon + label).
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<{ label: string; value: InspectionStatus; icon: string; color: string } | null>}
   */
  protected readonly selectedInspectionStatusOption = computed(() =>
    this.inspectionStatusOptions.find(
      (option) => option.value === this.selectedInspectionStatus(),
    ) ?? null,
  );

  /**
   * Property inspectionResultOptions
   *
   * @description
   * Selectable inspection result filter options, each with an icon and color.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {{ label: string; value: InspectionResult; icon: string; color: string }[]}
   */
  protected inspectionResultOptions: {
    label: string;
    value: InspectionResult;
    icon: string;
    color: string;
  }[] = [
    { label: 'Pass', value: 'pass', icon: 'pi pi-check-circle', color: '#22c55e' },
    { label: 'Fail', value: 'fail', icon: 'pi pi-times-circle', color: '#ef4444' },
    {
      label: 'Partial',
      value: 'partial',
      icon: 'pi pi-exclamation-circle',
      color: '#f97316',
    },
  ];
  /**
   * Property selectedInspectionResult
   * @readonly
   *
   * @description
   * The currently selected inspection result filter, or null for all results.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<InspectionResult | null>}
   */
  protected readonly selectedInspectionResult: WritableSignal<InspectionResult | null> =
    signal<InspectionResult | null>(null);

  /**
   * Property selectedInspectionResultOption
   * @readonly
   *
   * @description
   * Derived option object matching {@link selectedInspectionResult},
   * used to render the custom selected-item template in the result
   * dropdown (icon + label).
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<{ label: string; value: InspectionResult; icon: string; color: string } | null>}
   */
  protected readonly selectedInspectionResultOption = computed(() =>
    this.inspectionResultOptions.find(
      (option) => option.value === this.selectedInspectionResult(),
    ) ?? null,
  );

  /**
   * Property inspectorTypeOptions
   *
   * @description
   * Selectable inspector type filter options.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {{ label: string; value: InspectorType }[]}
   */
  protected inspectorTypeOptions: {
    label: string;
    value: InspectorType;
  }[] = [
    { label: 'User', value: 'user' },
    { label: 'External', value: 'external' },
  ];
  /**
   * Property selectedInspectorType
   * @readonly
   *
   * @description
   * The currently selected inspector type filter, or null for all types.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<InspectorType | null>}
   */
  protected readonly selectedInspectorType: WritableSignal<InspectorType | null> =
    signal<InspectorType | null>(null);

  /**
   * Property nonConformitySeverityOptions
   *
   * @description
   * Selectable NC severity filter options, each with a color dot.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {{ label: string; value: NonConformitySeverity; color: string }[]}
   */
  protected nonConformitySeverityOptions: {
    label: string;
    value: NonConformitySeverity;
    color: string;
  }[] = [
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
   * The currently selected NC severity filter, or null for all severities.
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
   * Derived option object matching {@link selectedNonConformitySeverity},
   * used to render the custom selected-item template in the severity
   * dropdown (color dot + label).
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<{ label: string; value: NonConformitySeverity; color: string } | null>}
   */
  protected readonly selectedSeverityOption = computed(() =>
    this.nonConformitySeverityOptions.find(
      (option) => option.value === this.selectedNonConformitySeverity(),
    ) ?? null,
  );

  /**
   * Property summaryMetrics
   * @readonly
   *
   * @description
   * Four KPI tiles rendered above the chart: Inspections, Opened NC,
   * NC Rate, and Rate Shift.
   * Automatically recomputes when the resource value changes.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly OrganizationDashboardInspectionQualitySummaryMetric[]>}
   */
  protected readonly summaryMetrics: Signal<readonly OrganizationDashboardInspectionQualitySummaryMetric[]> = computed(() => {
    const quality = this.qualityResource.value();
    const inspectionSeries = quality?.inspections?.series ?? [];
    const openedSeries = quality?.ncOpened?.series ?? [];
    const inspectionsTotal = sumDashboardTrendValues(
      inspectionSeries.map((point) => getDashboardTrendPointValue(point)),
    );
    const openedTotal = sumDashboardTrendValues(
      openedSeries.map((point) => getDashboardTrendPointValue(point)),
    );
    const currentRate = inspectionsTotal > 0 ? (openedTotal / inspectionsTotal) * 100 : 0;
    const previousInspectionsTotal = sumDashboardTrendValues(
      (quality?.inspections?.comparison?.series ?? []).map((point) => getDashboardTrendPointValue(point)),
    );
    const previousOpenedTotal = sumDashboardTrendValues(
      (quality?.ncOpened?.comparison?.series ?? []).map((point) => getDashboardTrendPointValue(point)),
    );
    const previousRate =
      previousInspectionsTotal > 0
        ? (previousOpenedTotal / previousInspectionsTotal) * 100
        : 0;

    return [
      {
        label: 'Inspections',
        value: this.formatWholeNumber(inspectionsTotal),
        icon: 'pi pi-list-check',
        comparison: this.buildComparison(inspectionsTotal, previousInspectionsTotal),
      },
      {
        label: 'Opened NC',
        value: this.formatWholeNumber(openedTotal),
        icon: 'pi pi-exclamation-triangle',
        comparison: this.buildComparison(openedTotal, previousOpenedTotal),
      },
      {
        label: 'NC Rate',
        value: `${this.percentFormatter.format(currentRate)}%`,
        icon: 'pi pi-percentage',
        comparison: null,
      },
      {
        label: 'Rate Shift',
        value: `${this.percentFormatter.format(currentRate - previousRate)} pts`,
        icon: 'pi pi-chart-line',
        comparison: null,
      },
    ];
  });

  /**
   * Property chartData
   * @readonly
   *
   * @description
   * Reactive Chart.js dataset derived from the aligned inspections and
   * NC-opened series. Appends comparison datasets when compare mode is
   * active and the API returns previous-period data.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<ChartData<'bar'>>}
   */
  protected readonly chartData: Signal<ChartData<'bar'>> = computed(() => {
    const quality = this.qualityResource.value();
    const aligned = alignDashboardTrendSeries(
      [quality?.inspections?.series, quality?.ncOpened?.series],
      this.selectedGranularity(),
    );
    const [inspectionData = [], openedData = []] = aligned.datasets;
    const datasets: ChartData<'bar'>['datasets'] = [
      {
        label: 'Inspections',
        data: inspectionData,
        backgroundColor: '#3b82f6',
        hoverBackgroundColor: '#2563eb',
      },
      {
        label: 'Opened NC',
        data: openedData,
        backgroundColor: '#f97316',
        hoverBackgroundColor: '#ea580c',
      },
    ];

    const inspectionComparisonData = (quality?.inspections?.comparison?.series ?? []).map((point) =>
      getDashboardTrendPointValue(point),
    );
    const openedComparisonData = (quality?.ncOpened?.comparison?.series ?? []).map((point) =>
      getDashboardTrendPointValue(point),
    );

    if (this.compareEnabled() && inspectionComparisonData.length > 0) {
      datasets.push({
        label: 'Inspections Previous Period',
        data: inspectionComparisonData,
        backgroundColor: '#93c5fd',
        hoverBackgroundColor: '#60a5fa',
      });
    }

    if (this.compareEnabled() && openedComparisonData.length > 0) {
      datasets.push({
        label: 'Opened NC Previous Period',
        data: openedComparisonData,
        backgroundColor: '#fdba74',
        hoverBackgroundColor: '#fb923c',
      });
    }

    return {
      labels: [...aligned.labels],
      datasets,
    };
  });

  /**
   * Property rateSeries
   * @readonly
   *
   * @description
   * Per-bucket NC rate series (opened NC / inspections × 100) used in
   * the chart tooltip title to display the quality percentage inline.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly number[]>}
   */
  protected readonly rateSeries: Signal<readonly number[]> = computed(() => {
    const quality = this.qualityResource.value();
    const aligned = alignDashboardTrendSeries(
      [quality?.inspections?.series, quality?.ncOpened?.series],
      this.selectedGranularity(),
    );
    const [inspectionData = [], openedData = []] = aligned.datasets;

    return buildPercentageSeries(openedData, inspectionData);
  });

  /**
   * Property chartOptions
   * @readonly
   *
   * @description
   * Reactive Chart.js options for the inspection quality grouped bar chart.
   * The tooltip title callback injects the per-bucket NC rate alongside
   * the default bucket label.
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
          title: (items) => {
            const item = items[0];

            if (!item) return '';

            const rate = this.rateSeries()[item.dataIndex] ?? 0;

            return `${item.label} • ${this.percentFormatter.format(rate)}% NC rate`;
          },
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
