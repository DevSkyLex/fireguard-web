import { computed, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
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
import { withQueryState, setPendingQuery, setSuccessQuery, setErrorQuery, toStoreError } from '@core/state/request-state';
import type { ChartData, ChartOptions } from 'chart.js';
import { EMPTY, forkJoin, pipe, switchMap } from 'rxjs';
import type { MetricComparison } from '@shared/components/metric-card';
import { OrganizationService } from '@features/organization/data-access';
import { ActiveOrganizationStore } from '@features/organization/state';
import type {
  OrganizationDashboardGranularity,
  OrganizationDashboardOverviewTrendResource,
  OrganizationDashboardTrendResourceParams,
} from '@features/organization/models';
import {
  alignDashboardTrendSeries,
  buildDifferenceSeries,
  getDashboardTrendPointValue,
  sumDashboardTrendValues,
} from '../../../data-access/adapters/organization-dashboard-trend.adapter';

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
 * Type OrganizationDashboardOverviewTrendSummaryMetric
 *
 * @description
 * Shape of a single summary metric tile displayed below the trend chart.
 *
 * @since 1.0.0
 */
type OrganizationDashboardOverviewTrendSummaryMetric = {
  readonly label: string;
  readonly value: string;
  readonly icon: string | null;
  readonly comparison: MetricComparison | null;
};

/**
 * Type OrganizationDashboardOverviewTrendState
 *
 * @description
 * Reactive state slice managed by
 * {@link OrganizationDashboardOverviewTrendStore}.
 *
 * @since 1.0.0
 */
type OrganizationDashboardOverviewTrendState = {
  readonly selectedGranularity: OrganizationDashboardGranularity;
  readonly selectedDateRange: Date[] | null;
  readonly compareEnabled: boolean;
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
 * @type {OrganizationDashboardOverviewTrendState}
 */
const INITIAL_STATE: OrganizationDashboardOverviewTrendState = {
  selectedGranularity: 'week',
  selectedDateRange: [
    new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
    new Date(),
  ],
  compareEnabled: true,
};

/**
 * Store OrganizationDashboardOverviewTrendStore
 * @const OrganizationDashboardOverviewTrendStore
 *
 * @description
 * Component-scoped NgRx SignalStore for the **Overview Trend** dashboard
 * card. Fires three parallel API calls (inspections, NC opened, NC resolved)
 * using `forkJoin`, then exposes a four-dataset line chart (including the
 * derived Net Pressure series) and four KPI metrics.
 *
 * @example
 * ```typescript
 * @Component({ providers: [OrganizationDashboardOverviewTrendStore] })
 * export class OrganizationDashboardOverviewTrend {
 *   protected readonly store = inject(OrganizationDashboardOverviewTrendStore);
 * }
 * ```
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const OrganizationDashboardOverviewTrendStore = signalStore(

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
  withQueryState<OrganizationDashboardOverviewTrendResource>(),
  withState<OrganizationDashboardOverviewTrendState>(INITIAL_STATE),
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
     * Computed summaryMetrics
     *
     * @description
     * Four KPI tiles derived from the latest fetched multi-dataset result.
     * Covers Inspections, Opened NC, Resolved NC, and Net Pressure,
     * each with optional period-over-period comparison.
     *
     * @since 1.0.0
     */
    summaryMetrics: computed<
      readonly OrganizationDashboardOverviewTrendSummaryMetric[]
    >(() => {
      const result = store.queryData();
      const compareEnabled = store.compareEnabled();

      const aligned = alignDashboardTrendSeries(
        [
          result?.inspections?.series,
          result?.ncOpened?.series,
          result?.ncResolved?.series,
        ],
        store.selectedGranularity(),
      );
      const [inspectionData = [], openedData = [], resolvedData = []] = aligned.datasets;
      const netPressureData = buildDifferenceSeries(openedData, resolvedData);

      const inspectionTotal = sumDashboardTrendValues(inspectionData);
      const openedTotal = sumDashboardTrendValues(openedData);
      const resolvedTotal = sumDashboardTrendValues(resolvedData);
      const netPressureTotal = sumDashboardTrendValues(netPressureData);

      const previousInspectionTotal = sumDashboardTrendValues(
        (result?.inspections?.comparison?.series ?? []).map((p) =>
          getDashboardTrendPointValue(p),
        ),
      );
      const previousOpenedTotal = sumDashboardTrendValues(
        (result?.ncOpened?.comparison?.series ?? []).map((p) => getDashboardTrendPointValue(p)),
      );
      const previousResolvedTotal = sumDashboardTrendValues(
        (result?.ncResolved?.comparison?.series ?? []).map((p) =>
          getDashboardTrendPointValue(p),
        ),
      );
      const previousNetPressure = previousOpenedTotal - previousResolvedTotal;
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
         */      const buildComparison = (current: number, previous: number): MetricComparison | null => {
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
          value: WHOLE_NUMBER_FMT.format(inspectionTotal),
          icon: 'pi pi-list-check',
          comparison: buildComparison(inspectionTotal, previousInspectionTotal),
        },
        {
          label: 'Opened NC',
          value: WHOLE_NUMBER_FMT.format(openedTotal),
          icon: 'pi pi-exclamation-triangle',
          comparison: buildComparison(openedTotal, previousOpenedTotal),
        },
        {
          label: 'Resolved NC',
          value: WHOLE_NUMBER_FMT.format(resolvedTotal),
          icon: 'pi pi-check-circle',
          comparison: buildComparison(resolvedTotal, previousResolvedTotal),
        },
        {
          label: 'Net Pressure',
          value: WHOLE_NUMBER_FMT.format(netPressureTotal),
          icon: 'pi pi-gauge',
          comparison: buildComparison(netPressureTotal, previousNetPressure),
        },
      ];
    }),

    /**
     * Computed chartData
     *
     * @description
     * Chart.js dataset built from the latest fetched data.
     * Renders a four-dataset line chart (Inspections, NC Opened, NC Resolved,
     * and the derived Net Pressure series).
     *
     * @since 1.0.0
     */
    chartData: computed<ChartData<'line'>>(() => {
      const result = store.queryData();
      const aligned = alignDashboardTrendSeries(
        [
          result?.inspections?.series,
          result?.ncOpened?.series,
          result?.ncResolved?.series,
        ],
        store.selectedGranularity(),
      );
      const [inspectionData = [], openedData = [], resolvedData = []] = aligned.datasets;
      const netPressureData = buildDifferenceSeries(openedData, resolvedData);

      return {
        labels: [...aligned.labels],
        datasets: [
          {
            label: 'Inspections',
            data: inspectionData,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.08)',
            borderWidth: 2,
            tension: 0.3,
            pointRadius: 0,
            pointHoverRadius: 5,
            pointHoverBorderWidth: 2,
            pointHoverBorderColor: '#fff',
            pointHoverBackgroundColor: '#3b82f6',
            fill: false,
          },
          {
            label: 'NC Opened',
            data: openedData,
            borderColor: '#f97316',
            backgroundColor: 'rgba(249, 115, 22, 0.08)',
            borderWidth: 2,
            tension: 0.3,
            pointRadius: 0,
            pointHoverRadius: 5,
            pointHoverBorderWidth: 2,
            pointHoverBorderColor: '#fff',
            pointHoverBackgroundColor: '#f97316',
            fill: false,
          },
          {
            label: 'NC Resolved',
            data: resolvedData,
            borderColor: '#22c55e',
            backgroundColor: 'rgba(34, 197, 94, 0.08)',
            borderWidth: 2,
            tension: 0.3,
            pointRadius: 0,
            pointHoverRadius: 5,
            pointHoverBorderWidth: 2,
            pointHoverBorderColor: '#fff',
            pointHoverBackgroundColor: '#22c55e',
            fill: false,
          },
          {
            label: 'Net Pressure',
            data: netPressureData,
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99, 102, 241, 0.08)',
            borderWidth: 2,
            borderDash: [5, 4],
            tension: 0.3,
            pointRadius: 0,
            pointHoverRadius: 5,
            pointHoverBorderWidth: 2,
            pointHoverBorderColor: '#fff',
            pointHoverBackgroundColor: '#6366f1',
            fill: false,
          },
        ],
      };
    }),

    /**
     * Computed chartOptions
     *
     * @description
     * Static Chart.js options object for the multi-series line chart.
     * Wrapped in a computed signal for API uniformity with `store.*()`.
     *
     * @since 1.0.0
     */
    chartOptions: computed<ChartOptions<'line'>>(() => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 400 },
      interaction: { mode: 'index', intersect: false },
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
          beginAtZero: false,
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
     * NgRx `rxMethod` that fetches three parallel trend datasets (inspections,
     * NC opened, NC resolved) via `forkJoin` whenever the params signal emits.
     * Undefined params are silently ignored via an `EMPTY` return.
     *
     * @since 1.0.0
     */
    load: rxMethod<OrganizationDashboardTrendResourceParams | undefined>(
      pipe(
        switchMap((params) => {
          if (!params) return EMPTY;

          patchState(store, setPendingQuery());

          return forkJoin({
            inspections: organizationService.getDashboardInspectionsTrend(
              params.organizationId,
              {
                granularity: params.granularity,
                from: params.from,
                to: params.to,
                compare: params.compare,
              },
            ),
            ncOpened: organizationService.getDashboardNonConformitiesOpenedTrend(
              params.organizationId,
              {
                granularity: params.granularity,
                from: params.from,
                to: params.to,
                compare: params.compare,
              },
            ),
            ncResolved: organizationService.getDashboardNonConformitiesResolvedTrend(
              params.organizationId,
              {
                granularity: params.granularity,
                from: params.from,
                to: params.to,
                compare: params.compare,
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
        const params = computed<OrganizationDashboardTrendResourceParams | undefined>(() => {
          if (!isPlatformBrowser(platformId)) return undefined;

          const organization = activeOrganizationStore.selectedOrganization();
          if (!organization) return undefined;

          const range = store.selectedDateRange();
          const toISO = (value: Date | undefined): string | undefined => value?.toISOString();

          return {
            organizationId: organization.id,
            granularity: store.selectedGranularity(),
            from: toISO(range?.[0]),
            to: toISO(range?.[1]),
            compare: store.compareEnabled() || undefined,
          };
        });

        store.load(params);
      },
    };
  }),
  //#endregion
);

/**
 * Type OrganizationDashboardOverviewTrendStore
 * @type OrganizationDashboardOverviewTrendStore
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export type OrganizationDashboardOverviewTrendStore = InstanceType<
  typeof OrganizationDashboardOverviewTrendStore
>;


