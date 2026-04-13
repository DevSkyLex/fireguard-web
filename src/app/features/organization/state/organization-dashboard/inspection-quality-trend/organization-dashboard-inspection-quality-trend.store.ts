import { isPlatformBrowser } from '@angular/common';
import { computed, inject, PLATFORM_ID } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import type { ChartData, ChartOptions } from 'chart.js';
import { EMPTY, forkJoin, pipe, switchMap } from 'rxjs';
import {
  withQueryState,
  setPendingQuery,
  setSuccessQuery,
  setErrorQuery,
  toStoreError,
} from '@core/state/request-state';
import { OrganizationService } from '@features/organization/data-access';
import type {
  InspectionResult,
  InspectionStatus,
  InspectorType,
  NonConformitySeverity,
} from '@features/organization/features/inspections/models';
import type {
  OrganizationDashboardGranularity,
  OrganizationDashboardTrendOutput,
  OrganizationDashboardTrendResourceParams,
} from '@features/organization/models';
import { ActiveOrganizationStore } from '@features/organization/state';
import type { MetricComparison } from '@shared/components/metric-card';
import {
  alignDashboardTrendSeries,
  buildPercentageSeries,
  getDashboardTrendPointValue,
  sumDashboardTrendValues,
} from '../../../data-access/adapters/organization-dashboard-trend.adapter';

const toIsoString = (value: Date | undefined): string | undefined => value?.toISOString();

/**
 * Type GranularityOption
 *
 * @description
 * Represents a single entry in the granularity select dropdown.
 *
 * @since 1.0.0
 */
type GranularityOption = {
  readonly label: string;
  readonly value: OrganizationDashboardGranularity;
};

/**
 * Type InspectionStatusOption
 *
 * @description
 * Represents a single entry in the inspection status select dropdown,
 * including a display icon and a color token.
 *
 * @since 1.0.0
 */
type InspectionStatusOption = {
  readonly label: string;
  readonly value: InspectionStatus;
  readonly icon: string;
  readonly color: string;
};

/**
 * Type InspectionResultOption
 *
 * @description
 * Represents a single entry in the inspection result select dropdown,
 * including a display icon and a color token.
 *
 * @since 1.0.0
 */
type InspectionResultOption = {
  readonly label: string;
  readonly value: InspectionResult;
  readonly icon: string;
  readonly color: string;
};

/**
 * Type InspectorTypeOption
 *
 * @description
 * Represents a single entry in the inspector type select dropdown.
 *
 * @since 1.0.0
 */
type InspectorTypeOption = {
  readonly label: string;
  readonly value: InspectorType;
};

/**
 * Type NonConformitySeverityOption
 *
 * @description
 * Represents a single entry in the non-conformity severity select dropdown.
 *
 * @since 1.0.0
 */
type NonConformitySeverityOption = {
  readonly label: string;
  readonly value: NonConformitySeverity;
  readonly color: string;
};

/**
 * Type OrganizationDashboardInspectionQualityData
 *
 * @description
 * Combined payload returned by the two parallel API calls
 * (inspections + NC opened). Stored in state after a successful load.
 *
 * @since 1.0.0
 */
type OrganizationDashboardInspectionQualityData = {
  readonly inspections: OrganizationDashboardTrendOutput;
  readonly ncOpened: OrganizationDashboardTrendOutput;
};

/**
 * Type OrganizationDashboardInspectionQualitySummaryMetric
 *
 * @description
 * Shape of a single summary metric tile displayed below the trend chart.
 *
 * @since 1.0.0
 */
type OrganizationDashboardInspectionQualitySummaryMetric = {
  readonly label: string;
  readonly value: string;
  readonly icon: string | null;
  readonly comparison: MetricComparison | null;
};

/**
 * Type OrganizationDashboardInspectionQualityParams
 *
 * @description
 * Parameters forwarded to both API calls on each load. Extends the base
 * trend resource params with all four dimension filters available on this card.
 *
 * @since 1.0.0
 */
type OrganizationDashboardInspectionQualityParams = OrganizationDashboardTrendResourceParams & {
  readonly inspectionStatus?: InspectionStatus;
  readonly inspectionResult?: InspectionResult;
  readonly inspectorType?: InspectorType;
  readonly nonConformitySeverity?: NonConformitySeverity;
};

/**
 * Type OrganizationDashboardInspectionQualityState
 *
 * @description
 * Reactive state slice managed by
 * {@link OrganizationDashboardInspectionQualityStore}.
 *
 * @since 1.0.0
 */
type OrganizationDashboardInspectionQualityState = {
  readonly selectedGranularity: OrganizationDashboardGranularity;
  readonly selectedDateRange: Date[] | null;
  readonly compareEnabled: boolean;
  readonly selectedInspectionStatus: InspectionStatus | null;
  readonly selectedInspectionResult: InspectionResult | null;
  readonly selectedInspectorType: InspectorType | null;
  readonly selectedNonConformitySeverity: NonConformitySeverity | null;
};

/**
 * Constant GRANULARITY_OPTIONS
 * @readonly
 *
 * @description
 * Exhaustive list of selectable time granularities for the trend chart.
 *
 * @since 1.0.0
 *
 * @type {GranularityOption[]}
 */
const GRANULARITY_OPTIONS: GranularityOption[] = [
  { label: 'Daily', value: 'day' },
  { label: 'Weekly', value: 'week' },
  { label: 'Monthly', value: 'month' },
];

/**
 * Constant INSPECTION_STATUS_OPTIONS
 * @readonly
 *
 * @description
 * Exhaustive list of selectable inspection statuses used to filter the trend
 * query, each enriched with a display icon and color token.
 *
 * @since 1.0.0
 *
 * @type {InspectionStatusOption[]}
 */
const INSPECTION_STATUS_OPTIONS: InspectionStatusOption[] = [
  { label: 'Draft', value: 'draft', icon: 'pi pi-file-edit', color: '#3b82f6' },
  { label: 'Submitted', value: 'submitted', icon: 'pi pi-send', color: '#f59e0b' },
  { label: 'Closed', value: 'closed', icon: 'pi pi-lock', color: '#64748b' },
];

/**
 * Constant INSPECTION_RESULT_OPTIONS
 * @readonly
 *
 * @description
 * Exhaustive list of selectable inspection results used to filter the trend
 * query, each enriched with a display icon and color token.
 *
 * @since 1.0.0
 *
 * @type {InspectionResultOption[]}
 */
const INSPECTION_RESULT_OPTIONS: InspectionResultOption[] = [
  { label: 'Pass', value: 'pass', icon: 'pi pi-check-circle', color: '#22c55e' },
  { label: 'Fail', value: 'fail', icon: 'pi pi-times-circle', color: '#ef4444' },
  { label: 'Partial', value: 'partial', icon: 'pi pi-exclamation-circle', color: '#f59e0b' },
];

/**
 * Constant INSPECTOR_TYPE_OPTIONS
 * @readonly
 *
 * @description
 * Exhaustive list of selectable inspector types used to filter the trend query.
 *
 * @since 1.0.0
 *
 * @type {InspectorTypeOption[]}
 */
const INSPECTOR_TYPE_OPTIONS: InspectorTypeOption[] = [
  { label: 'User', value: 'user' },
  { label: 'External', value: 'external' },
];

/**
 * Constant NON_CONFORMITY_SEVERITY_OPTIONS
 * @readonly
 *
 * @description
 * Exhaustive list of selectable non-conformity severity levels used to filter
 * the trend query.
 *
 * @since 1.0.0
 *
 * @type {NonConformitySeverityOption[]}
 */
const NON_CONFORMITY_SEVERITY_OPTIONS: NonConformitySeverityOption[] = [
  { label: 'Low', value: 'low', color: '#22c55e' },
  { label: 'Medium', value: 'medium', color: '#eab308' },
  { label: 'High', value: 'high', color: '#f97316' },
  { label: 'Critical', value: 'critical', color: '#ef4444' },
];

/**
 * Constant WHOLE_NUMBER_FMT
 * @readonly
 *
 * @description
 * Shared `Intl.NumberFormat` instance that formats counts as whole integers
 * with no decimal places (e.g. `1 234`).
 *
 * @since 1.0.0
 *
 * @type {Intl.NumberFormat}
 */
const WHOLE_NUMBER_FMT = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

/**
 * Constant PERCENT_FMT
 * @readonly
 *
 * @description
 * Shared `Intl.NumberFormat` instance that formats rates with a maximum
 * of one decimal place (e.g. `42.3`).
 *
 * @since 1.0.0
 *
 * @type {Intl.NumberFormat}
 */
const PERCENT_FMT = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });

/**
 * Function hexToRgb
 * @readonly
 *
 * @description
 * Converts a six-digit hex color string to a `[r, g, b]` tuple of integer
 * values in the 0–255 range. Used to build dynamic `rgba()` gradient strings
 * for the chart dataset fill.
 *
 * @since 1.0.0
 *
 * @type {(hex: string) => [number, number, number]}
 */
const hexToRgb = (hex: string): [number, number, number] => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

/**
 * Constant INITIAL_STATE
 * @readonly
 *
 * @description
 * Default state applied when the store is first instantiated.
 * Defaults the date range to the last full calendar month up to today
 * with weekly granularity and comparison enabled.
 *
 * @since 1.0.0
 *
 * @type {OrganizationDashboardInspectionQualityState}
 */
const INITIAL_STATE: OrganizationDashboardInspectionQualityState = {
  selectedGranularity: 'week',
  selectedDateRange: [new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1), new Date()],
  compareEnabled: true,
  selectedInspectionStatus: null,
  selectedInspectionResult: null,
  selectedInspectorType: null,
  selectedNonConformitySeverity: null,
};

/**
 * Store OrganizationDashboardInspectionQualityStore
 * @const OrganizationDashboardInspectionQualityStore
 *
 * @description
 * Component-scoped NgRx SignalStore for the **Inspection Quality** dashboard
 * card. Fires two parallel API calls (inspections + NC opened) via `forkJoin`,
 * exposes four KPI metrics (Inspections, Opened NC, NC Rate, Rate Shift),
 * and builds a combo bar/line chart with a secondary NC-rate axis.
 *
 * @example
 * ```typescript
 * @Component({ providers: [OrganizationDashboardInspectionQualityStore] })
 * export class OrganizationDashboardInspectionQualityTrend {
 *   protected readonly store = inject(OrganizationDashboardInspectionQualityStore);
 * }
 * ```
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const OrganizationDashboardInspectionQualityStore = signalStore(
  //#region State

  /**
   * Feature withState
   *
   * @description
   * Seeds the store with the initial filter state and async-operation
   * flags. All keys become deeply-signal-wrapped `SignalState` entries
   * that expose typed read signals on the store instance.
   *
   * @since 1.0.0
   */
  withQueryState<OrganizationDashboardInspectionQualityData>(),
  withState<OrganizationDashboardInspectionQualityState>(INITIAL_STATE),
  //#endregion

  //#region Computed

  /**
   * Feature withComputed
   *
   * @description
   * Adds derived read-only signals on top of the raw state signals.
   * All computeds re-evaluate lazily whenever their signal dependencies change.
   *
   * @since 1.0.0
   */
  withComputed((store) => ({
    /**
     * Computed granularityOptions
     *
     * @description
     * Static list of granularity selector options. Exposed as a computed
     * signal so consumers can bind to it uniformly via `store.*()`.
     *
     * @since 1.0.0
     */
    granularityOptions: computed<GranularityOption[]>(() => GRANULARITY_OPTIONS),

    /**
     * Computed inspectionStatusOptions
     *
     * @description
     * Static list of inspection-status selector options. Exposed as a computed
     * signal for uniform binding.
     *
     * @since 1.0.0
     */
    inspectionStatusOptions: computed<InspectionStatusOption[]>(() => INSPECTION_STATUS_OPTIONS),

    /**
     * Computed inspectionResultOptions
     *
     * @description
     * Static list of inspection-result selector options. Exposed as a computed
     * signal for uniform binding.
     *
     * @since 1.0.0
     */
    inspectionResultOptions: computed<InspectionResultOption[]>(() => INSPECTION_RESULT_OPTIONS),

    /**
     * Computed inspectorTypeOptions
     *
     * @description
     * Static list of inspector-type selector options. Exposed as a computed
     * signal for uniform binding.
     *
     * @since 1.0.0
     */
    inspectorTypeOptions: computed<InspectorTypeOption[]>(() => INSPECTOR_TYPE_OPTIONS),

    /**
     * Computed nonConformitySeverityOptions
     *
     * @description
     * Static list of NC-severity selector options. Exposed as a computed
     * signal for uniform binding.
     *
     * @since 1.0.0
     */
    nonConformitySeverityOptions: computed<NonConformitySeverityOption[]>(
      () => NON_CONFORMITY_SEVERITY_OPTIONS,
    ),

    /**
     * Computed maxRangeDays
     *
     * @description
     * Maximum selectable date-range in days, derived from the active
     * granularity. Daily: 90 — Weekly: 365 — Monthly: 730.
     *
     * @since 1.0.0
     */
    maxRangeDays: computed<number>(() => {
      switch (store.selectedGranularity()) {
        case 'day':
          return 90;
        case 'month':
          return 730;
        default:
          return 365;
      }
    }),

    /**
     * Computed selectedInspectionStatusOption
     *
     * @description
     * Full option object matching the currently selected inspection status.
     * Returns `null` when no status filter is active.
     *
     * @since 1.0.0
     */
    selectedInspectionStatusOption: computed<InspectionStatusOption | null>(
      () =>
        INSPECTION_STATUS_OPTIONS.find((o) => o.value === store.selectedInspectionStatus()) ?? null,
    ),

    /**
     * Computed selectedInspectionResultOption
     *
     * @description
     * Full option object matching the currently selected inspection result.
     * Returns `null` when no result filter is active.
     *
     * @since 1.0.0
     */
    selectedInspectionResultOption: computed<InspectionResultOption | null>(
      () =>
        INSPECTION_RESULT_OPTIONS.find((o) => o.value === store.selectedInspectionResult()) ?? null,
    ),

    /**
     * Computed selectedSeverityOption
     *
     * @description
     * Full option object matching the currently selected NC severity.
     * Returns `null` when no severity filter is active.
     *
     * @since 1.0.0
     */
    selectedSeverityOption: computed<NonConformitySeverityOption | null>(
      () =>
        NON_CONFORMITY_SEVERITY_OPTIONS.find(
          (o) => o.value === store.selectedNonConformitySeverity(),
        ) ?? null,
    ),

    /**
     * Computed summaryMetrics
     *
     * @description
     * Four KPI tiles: Inspections count, Opened NC count, NC Rate (%),
     * and Rate Shift (delta between current and previous periods in percentage points).
     *
     * @since 1.0.0
     */
    summaryMetrics: computed<readonly OrganizationDashboardInspectionQualitySummaryMetric[]>(() => {
      const quality = store.queryData();
      const compareEnabled = store.compareEnabled();

      const inspectionsTotal = sumDashboardTrendValues(
        (quality?.inspections?.series ?? []).map((p) => getDashboardTrendPointValue(p)),
      );
      const openedTotal = sumDashboardTrendValues(
        (quality?.ncOpened?.series ?? []).map((p) => getDashboardTrendPointValue(p)),
      );
      const currentRate = inspectionsTotal > 0 ? (openedTotal / inspectionsTotal) * 100 : 0;

      const previousInspectionsTotal = sumDashboardTrendValues(
        (quality?.inspections?.comparison?.series ?? []).map((p) => getDashboardTrendPointValue(p)),
      );
      const previousOpenedTotal = sumDashboardTrendValues(
        (quality?.ncOpened?.comparison?.series ?? []).map((p) => getDashboardTrendPointValue(p)),
      );
      const previousRate =
        previousInspectionsTotal > 0 ? (previousOpenedTotal / previousInspectionsTotal) * 100 : 0;

      /**
       * Function buildComparison
       * @function buildComparison
       *
       * @description
       * Builds a {@link MetricComparison} object from the delta between
       * the current and previous period values. Returns null when
       * compare mode is disabled or the delta is exactly zero.
       *
       * @param {number} current - Current period total.
       * @param {number} previous - Previous period total.
       * @returns {MetricComparison | null} Comparison metadata, or null.
       */
      const buildComparison = (current: number, previous: number): MetricComparison | null => {
        if (!compareEnabled) return null;
        const delta = current - previous;
        if (delta === 0) return { value: 'Flat', direction: null };
        return {
          value: `${delta > 0 ? '+' : ''}${WHOLE_NUMBER_FMT.format(delta)}`,
          direction: delta > 0 ? 'up' : 'down',
        };
      };

      return [
        {
          label: 'Inspections',
          value: WHOLE_NUMBER_FMT.format(inspectionsTotal),
          icon: 'pi pi-list-check',
          comparison: buildComparison(inspectionsTotal, previousInspectionsTotal),
        },
        {
          label: 'Opened NC',
          value: WHOLE_NUMBER_FMT.format(openedTotal),
          icon: 'pi pi-exclamation-triangle',
          comparison: buildComparison(openedTotal, previousOpenedTotal),
        },
        {
          label: 'NC Rate',
          value: `${PERCENT_FMT.format(currentRate)}%`,
          icon: 'pi pi-percentage',
          comparison: null,
        },
        {
          label: 'Rate Shift',
          value: `${PERCENT_FMT.format(currentRate - previousRate)} pts`,
          icon: 'pi pi-chart-line',
          comparison: null,
        },
      ];
    }),

    /**
     * Computed rateSeries
     *
     * @description
     * Series of NC rates (opened NC count ÷ inspections count × 100) aligned
     * to the active granularity buckets. Used as the secondary line dataset
     * on the right-hand axis of the combo chart.
     *
     * @since 1.0.0
     */
    rateSeries: computed<readonly number[]>(() => {
      const quality = store.queryData();
      const aligned = alignDashboardTrendSeries(
        [quality?.inspections?.series, quality?.ncOpened?.series],
        store.selectedGranularity(),
      );
      const [inspectionData = [], openedData = []] = aligned.datasets;
      return buildPercentageSeries(openedData, inspectionData);
    }),

    /**
     * Computed chartData
     *
     * @description
     * Chart.js dataset built from the latest fetched data.
     * Renders a combo bar/line chart: bars for inspections and NC counts,
     * a secondary line for the NC rate on a right-hand axis.
     *
     * @since 1.0.0
     */
    chartData: computed<ChartData<'bar'>>(() => {
      const quality = store.queryData();
      const compareEnabled = store.compareEnabled();
      const aligned = alignDashboardTrendSeries(
        [quality?.inspections?.series, quality?.ncOpened?.series],
        store.selectedGranularity(),
      );
      const [inspectionData = [], openedData = []] = aligned.datasets;

      const activeResult = store.selectedInspectionResult();
      const activeStatus = store.selectedInspectionStatus();
      const inspectionColor: string = activeResult
        ? (INSPECTION_RESULT_OPTIONS.find((o) => o.value === activeResult)?.color ?? '#3b82f6')
        : activeStatus
          ? (INSPECTION_STATUS_OPTIONS.find((o) => o.value === activeStatus)?.color ?? '#3b82f6')
          : '#3b82f6';

      const activeNcSeverity = store.selectedNonConformitySeverity();
      const ncColor: string = activeNcSeverity
        ? (NON_CONFORMITY_SEVERITY_OPTIONS.find((o) => o.value === activeNcSeverity)?.color ??
          '#ef4444')
        : '#ef4444';

      const [ir, ig, ib] = hexToRgb(inspectionColor);
      const [nr, ng, nb] = hexToRgb(ncColor);

      const datasets: ChartData<'bar'>['datasets'] = [
        {
          label: 'Inspections',
          data: inspectionData,
          backgroundColor: inspectionColor,
          hoverBackgroundColor: `rgba(${ir}, ${ig}, ${ib}, 0.75)`,
        },
        {
          label: 'Opened NC',
          data: openedData,
          backgroundColor: ncColor,
          hoverBackgroundColor: `rgba(${nr}, ${ng}, ${nb}, 0.75)`,
        },
      ];

      const inspectionComparisonData = (quality?.inspections?.comparison?.series ?? []).map((p) =>
        getDashboardTrendPointValue(p),
      );
      const openedComparisonData = (quality?.ncOpened?.comparison?.series ?? []).map((p) =>
        getDashboardTrendPointValue(p),
      );

      if (compareEnabled && inspectionComparisonData.length > 0) {
        datasets.push({
          label: 'Inspections Previous Period',
          data: inspectionComparisonData,
          backgroundColor: `rgba(${ir}, ${ig}, ${ib}, 0.35)`,
          hoverBackgroundColor: `rgba(${ir}, ${ig}, ${ib}, 0.5)`,
        });
      }

      if (compareEnabled && openedComparisonData.length > 0) {
        datasets.push({
          label: 'Opened NC Previous Period',
          data: openedComparisonData,
          backgroundColor: `rgba(${nr}, ${ng}, ${nb}, 0.35)`,
          hoverBackgroundColor: `rgba(${nr}, ${ng}, ${nb}, 0.5)`,
        });
      }

      datasets.push({
        type: 'line' as const,
        label: 'NC Rate (%)',
        data: buildPercentageSeries(openedData, inspectionData),
        yAxisID: 'rateAxis',
        borderColor: '#a855f7',
        backgroundColor: 'rgba(168, 85, 247, 0.08)',
        borderWidth: 2,
        tension: 0.3,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBorderWidth: 2,
        pointHoverBorderColor: '#fff',
        pointHoverBackgroundColor: '#a855f7',
        fill: false,
        order: 0,
      } as unknown as ChartData<'bar'>['datasets'][number]);

      return { labels: [...aligned.labels], datasets };
    }),

    /**
     * Computed chartOptions
     *
     * @description
     * Static Chart.js options object for the combo bar/line chart.
     * Includes a secondary `rateAxis` on the right for the NC-rate line.
     * Wrapped in a computed signal for API uniformity with `store.*()`.
     *
     * @since 1.0.0
     */
    chartOptions: computed<ChartOptions<'bar'>>(() => ({
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
        x: {
          border: { display: false },
          grid: { display: false },
          ticks: { display: false },
        },
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
        rateAxis: {
          type: 'linear' as const,
          position: 'right' as const,
          border: { display: false },
          beginAtZero: true,
          grid: { display: false },
          ticks: {
            callback: (value: number | string) => `${value}%`,
            maxTicksLimit: 5,
            color: '#94a3b8',
            font: { size: 11 },
          },
        },
      },
    })),
  })),
  //#endregion

  //#region Methods

  /**
   * Feature withMethods
   *
   * @description
   * Adds the main async load action and all synchronous filter-state
   * mutation methods. Every setter patches state via `patchState`; the
   * reactive load flow is driven automatically by `withHooks`.
   *
   * @since 1.0.0
   */
  withMethods((store, organizationService = inject(OrganizationService)) => ({
    /**
     * Method load
     *
     * @description
     * NgRx `rxMethod` that fetches two parallel trend datasets (inspections
     * and NC opened) via `forkJoin` whenever the params signal emits.
     * Undefined params are silently ignored via an `EMPTY` return.
     *
     * @since 1.0.0
     */
    load: rxMethod<OrganizationDashboardInspectionQualityParams | undefined>(
      pipe(
        switchMap((params) => {
          if (!params) return EMPTY;

          patchState(store, setPendingQuery());

          return forkJoin({
            inspections: organizationService.getDashboardInspectionsTrend(params.organizationId, {
              granularity: params.granularity,
              from: params.from,
              to: params.to,
              compare: params.compare,
              inspectionStatus: params.inspectionStatus,
              inspectionResult: params.inspectionResult,
              inspectorType: params.inspectorType,
            }),
            ncOpened: organizationService.getDashboardNonConformitiesOpenedTrend(
              params.organizationId,
              {
                granularity: params.granularity,
                from: params.from,
                to: params.to,
                compare: params.compare,
                nonConformitySeverity: params.nonConformitySeverity,
              },
            ),
          }).pipe(
            tapResponse({
              next: (data) => patchState(store, setSuccessQuery(data)),
              error: (err) => patchState(store, setErrorQuery(toStoreError(err))),
            }),
          );
        }),
      ),
    ),

    /**
     * Method setGranularity
     *
     * @description
     * Updates the active time granularity. Triggers a new fetch.
     *
     * @param {OrganizationDashboardGranularity} granularity - New granularity.
     * @returns {void}
     * @since 1.0.0
     */
    setGranularity(granularity: OrganizationDashboardGranularity): void {
      patchState(store, { selectedGranularity: granularity });
    },

    /**
     * Method setDateRange
     *
     * @description
     * Updates the selected date range. Automatically clamps the end date
     * if the span exceeds `maxRangeDays`.
     *
     * @param {Date[] | null} range - New range as `[from, to]`.
     * @returns {void}
     * @since 1.0.0
     */
    setDateRange(range: Date[] | null): void {
      if (!range || range.length < 2 || !range[0] || !range[1]) {
        patchState(store, { selectedDateRange: range });
        return;
      }
      const [from, to] = range;
      const maxMs = store.maxRangeDays() * 24 * 60 * 60 * 1000;
      if (to.getTime() - from.getTime() > maxMs) {
        patchState(store, { selectedDateRange: [from, new Date(from.getTime() + maxMs)] });
        return;
      }
      patchState(store, { selectedDateRange: range });
    },

    /**
     * Method setCompareEnabled
     *
     * @description
     * Enables or disables period-over-period comparison mode.
     *
     * @param {boolean} compareEnabled - Whether comparison mode is active.
     * @returns {void}
     * @since 1.0.0
     */
    setCompareEnabled(compareEnabled: boolean): void {
      patchState(store, { compareEnabled });
    },

    /**
     * Method setInspectionStatus
     *
     * @description
     * Updates the active inspection-status filter. Triggers a new fetch.
     *
     * @param {InspectionStatus | null} inspectionStatus - New status, or null to clear.
     * @returns {void}
     * @since 1.0.0
     */
    setInspectionStatus(inspectionStatus: InspectionStatus | null): void {
      patchState(store, { selectedInspectionStatus: inspectionStatus });
    },

    /**
     * Method setInspectionResult
     *
     * @description
     * Updates the active inspection-result filter. Triggers a new fetch.
     *
     * @param {InspectionResult | null} inspectionResult - New result, or null to clear.
     * @returns {void}
     * @since 1.0.0
     */
    setInspectionResult(inspectionResult: InspectionResult | null): void {
      patchState(store, { selectedInspectionResult: inspectionResult });
    },

    /**
     * Method setInspectorType
     *
     * @description
     * Updates the active inspector-type filter. Triggers a new fetch.
     *
     * @param {InspectorType | null} inspectorType - New inspector type, or null to clear.
     * @returns {void}
     * @since 1.0.0
     */
    setInspectorType(inspectorType: InspectorType | null): void {
      patchState(store, { selectedInspectorType: inspectorType });
    },

    /**
     * Method setNonConformitySeverity
     *
     * @description
     * Updates the active NC-severity filter. Triggers a new fetch.
     *
     * @param {NonConformitySeverity | null} nonConformitySeverity - New severity, or null to clear.
     * @returns {void}
     * @since 1.0.0
     */
    setNonConformitySeverity(nonConformitySeverity: NonConformitySeverity | null): void {
      patchState(store, { selectedNonConformitySeverity: nonConformitySeverity });
    },
  })),
  //#endregion

  //#region Hooks

  /**
   * Feature withHooks
   *
   * @description
   * Wires up the reactive data-fetching effect on store init.
   *
   * @since 1.0.0
   */
  withHooks((store) => {
    const platformId = inject(PLATFORM_ID);
    const activeOrganizationStore = inject(ActiveOrganizationStore);

    return {
      /**
       * Hook onInit
       *
       * @description
       * Builds a `computed` signal from all filter-state dependencies and
       * connects it to {@link load} via `rxMethod`. Angular's signal graph
       * re-evaluates the computed automatically whenever any dependency changes,
       * triggering a new API request without any imperative coordination.
       *
       * @returns {void}
       */
      onInit(): void {
        const params = computed<OrganizationDashboardInspectionQualityParams | undefined>(() => {
          if (!isPlatformBrowser(platformId)) return undefined;

          const organization = activeOrganizationStore.selectedOrganization();
          if (!organization) return undefined;

          const range = store.selectedDateRange();

          return {
            organizationId: organization.id,
            granularity: store.selectedGranularity(),
            from: toIsoString(range?.[0]),
            to: toIsoString(range?.[1]),
            compare: store.compareEnabled() || undefined,
            inspectionStatus: store.selectedInspectionStatus() ?? undefined,
            inspectionResult: store.selectedInspectionResult() ?? undefined,
            inspectorType: store.selectedInspectorType() ?? undefined,
            nonConformitySeverity: store.selectedNonConformitySeverity() ?? undefined,
          };
        });

        store.load(params);
      },
    };
  }),
  //#endregion
);

/**
 * Type OrganizationDashboardInspectionQualityStore
 * @type OrganizationDashboardInspectionQualityStore
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export type OrganizationDashboardInspectionQualityStore = InstanceType<
  typeof OrganizationDashboardInspectionQualityStore
>;
