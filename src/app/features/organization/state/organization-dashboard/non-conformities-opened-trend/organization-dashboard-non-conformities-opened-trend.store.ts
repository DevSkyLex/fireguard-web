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
import type { ChartData, ChartOptions, ScriptableContext } from 'chart.js';
import { EMPTY, pipe, switchMap } from 'rxjs';
import type { MetricComparison } from '@shared/components/metric-card';
import { OrganizationService } from '@features/organization/data-access';
import { ActiveOrganizationStore } from '@features/organization/state';
import type {
  OrganizationDashboardGranularity,
  OrganizationDashboardNonConformityTrendResourceParams,
  OrganizationDashboardTrendOutput,
} from '@features/organization/models';
import type { NonConformitySeverity, NonConformityStatus } from '@features/organization/features/inspections/models';
import { getDashboardTrendPointValue, sumDashboardTrendValues } from '../../../data-access/adapters/organization-dashboard-trend.adapter';

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
 * Type NonConformityStatusOption
 *
 * @description
 * Represents a single entry in the non-conformity status select dropdown,
 * including a display icon and a color token.
 *
 * @since 1.0.0
 */
type NonConformityStatusOption = {
  readonly label: string;
  readonly value: NonConformityStatus;
  readonly icon: string;
  readonly color: string;
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
 * Type OrganizationDashboardNonConformitiesOpenedSummaryMetric
 *
 * @description
 * Shape of a single summary metric tile displayed below the trend chart.
 *
 * @since 1.0.0
 */
type OrganizationDashboardNonConformitiesOpenedSummaryMetric = {
  readonly label: string;
  readonly value: string;
  readonly icon: string | null;
  readonly comparison: MetricComparison | null;
};

/**
 * Type OrganizationDashboardNonConformitiesOpenedState
 *
 * @description
 * Reactive state slice managed by
 * {@link OrganizationDashboardNonConformitiesOpenedStore}.
 *
 * @since 1.0.0
 */
type OrganizationDashboardNonConformitiesOpenedState = {
  readonly selectedGranularity: OrganizationDashboardGranularity;
  readonly selectedDateRange: Date[] | null;
  readonly compareEnabled: boolean;
  readonly selectedNonConformityStatus: NonConformityStatus | null;
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
 * Constant NON_CONFORMITY_STATUS_OPTIONS
 * @readonly
 *
 * @description
 * Exhaustive list of selectable non-conformity statuses used to filter the
 * trend query, each enriched with a display icon and color token.
 *
 * @since 1.0.0
 *
 * @type {NonConformityStatusOption[]}
 */
const NON_CONFORMITY_STATUS_OPTIONS: NonConformityStatusOption[] = [
  { label: 'Open', value: 'open', icon: 'pi pi-exclamation-circle', color: '#ef4444' },
  { label: 'In Progress', value: 'in_progress', icon: 'pi pi-spinner', color: '#f97316' },
  { label: 'Done', value: 'done', icon: 'pi pi-check-circle', color: '#22c55e' },
  { label: 'Waived', value: 'waived', icon: 'pi pi-minus-circle', color: '#94a3b8' },
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
 * @type {OrganizationDashboardNonConformitiesOpenedState}
 */
const INITIAL_STATE: OrganizationDashboardNonConformitiesOpenedState = {
  selectedGranularity: 'week',
  selectedDateRange: [
    new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
    new Date(),
  ],
  compareEnabled: true,
  selectedNonConformityStatus: null,
  selectedNonConformitySeverity: null,
};

/**
 * Store OrganizationDashboardNonConformitiesOpenedStore
 * @const OrganizationDashboardNonConformitiesOpenedStore
 *
 * @description
 * Component-scoped NgRx SignalStore for the **Opened Non-Conformities**
 * dashboard trend card. Manages NC-status and NC-severity filter state,
 * fires the `getDashboardNonConformitiesOpenedTrend` API call reactively,
 * and exposes fully derived chart data and summary metrics.
 *
 * @example
 * ```typescript
 * @Component({ providers: [OrganizationDashboardNonConformitiesOpenedStore] })
 * export class OrganizationDashboardNonConformitiesOpenedTrend {
 *   protected readonly store = inject(OrganizationDashboardNonConformitiesOpenedStore);
 * }
 * ```
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const OrganizationDashboardNonConformitiesOpenedStore = signalStore(

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
  withQueryState<OrganizationDashboardTrendOutput>(),
  withState<OrganizationDashboardNonConformitiesOpenedState>(INITIAL_STATE),
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
     * Computed nonConformityStatusOptions
     *
     * @description
     * Static list of NC-status selector options. Exposed as a computed
     * signal for uniform binding.
     *
     * @since 1.0.0
     */
    nonConformityStatusOptions: computed<NonConformityStatusOption[]>(
      () => NON_CONFORMITY_STATUS_OPTIONS,
    ),

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
     * Computed selectedNonConformityStatusOption
     *
     * @description
     * Full option object matching the currently selected NC status.
     * Returns `null` when no status filter is active.
     *
     * @since 1.0.0
     */
    selectedNonConformityStatusOption: computed<NonConformityStatusOption | null>(
      () =>
        NON_CONFORMITY_STATUS_OPTIONS.find(
          (o) => o.value === store.selectedNonConformityStatus(),
        ) ?? null,
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
     * KPI tile derived from the latest fetched dataset.
     * Includes opened non-conformity count with optional period-over-period comparison.
     *
     * @since 1.0.0
     */
    summaryMetrics: computed<readonly OrganizationDashboardNonConformitiesOpenedSummaryMetric[]>(
      () => {
        const trend = store.queryData();
        const compareEnabled = store.compareEnabled();

        const total = sumDashboardTrendValues(
          (trend?.series ?? []).map((p) => getDashboardTrendPointValue(p)),
        );
        const previousTotal = sumDashboardTrendValues(
          (trend?.comparison?.series ?? []).map((p) => getDashboardTrendPointValue(p)),
        );

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
            label: 'Opened NC',
            value: WHOLE_NUMBER_FMT.format(total),
            icon: 'pi pi-exclamation-triangle',
            comparison: buildComparison(total, previousTotal),
          },
        ];
      },
    ),

    /**
     * Computed chartData
     *
     * @description
     * Chart.js dataset built from the latest fetched data.
     * Renders a line chart with a gradient fill and optional comparison dataset.
     *
     * @since 1.0.0
     */
    chartData: computed<ChartData<'line'>>(() => {
      const trend = store.queryData();
      const compareEnabled = store.compareEnabled();

      const data: number[] = (trend?.series ?? []).map((p) =>
        Number(p['count'] ?? p['total'] ?? p['value'] ?? 0),
      );
      const comparisonData: number[] = (trend?.comparison?.series ?? []).map((p) =>
        Number(p['count'] ?? p['total'] ?? p['value'] ?? 0),
      );

      const datasets: ChartData<'line'>['datasets'] = [
        {
          label: 'Non-Conformities Opened',
          data,
          borderColor: '#f97316',
          backgroundColor: (context: ScriptableContext<'line'>): CanvasGradient | string => {
            const { ctx, chartArea } = context.chart;
            if (!chartArea) return 'rgba(249, 115, 22, 0)';
            const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            gradient.addColorStop(0, 'rgba(249, 115, 22, 0.25)');
            gradient.addColorStop(1, 'rgba(249, 115, 22, 0)');
            return gradient;
          },
          borderWidth: 2,
          tension: 0.3,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBorderWidth: 2,
          pointHoverBorderColor: '#fff',
          pointHoverBackgroundColor: '#f97316',
          fill: 'origin',
        },
      ];

      if (compareEnabled && comparisonData.length > 0) {
        datasets.push({
          label: 'Previous Period',
          data: comparisonData,
          borderColor: '#fdba74',
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          borderDash: [4, 4],
          tension: 0.3,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHoverBorderWidth: 2,
          pointHoverBorderColor: '#fff',
          pointHoverBackgroundColor: '#fdba74',
          fill: false,
        });
      }

      return { labels: trend?.series.map(() => '') ?? [], datasets };
    }),

    /**
     * Computed chartOptions
     *
     * @description
     * Static Chart.js options object for the line chart.
     * Wrapped in a computed signal for API uniformity with `store.*()`.
     *
     * @since 1.0.0
     */
    chartOptions: computed<ChartOptions<'line'>>(() => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 500 },
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          display: store.compareEnabled(),
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
     * NgRx `rxMethod` that fetches the non-conformities-opened trend dataset
     * whenever the params signal emits a new value.
     * Undefined params are silently ignored via an `EMPTY` return.
     *
     * @since 1.0.0
     */
    load: rxMethod<OrganizationDashboardNonConformityTrendResourceParams | undefined>(
      pipe(
        switchMap((params) => {
          if (!params) return EMPTY;

          patchState(store, setPendingQuery());

          return organizationService
            .getDashboardNonConformitiesOpenedTrend(params.organizationId, {
              granularity: params.granularity,
              from: params.from,
              to: params.to,
              compare: params.compare,
              nonConformityStatus: params.nonConformityStatus,
              nonConformitySeverity: params.nonConformitySeverity,
            })
            .pipe(
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
     * Method setNonConformityStatus
     *
     * @description
     * Updates the active NC-status filter. Triggers a new fetch.
     *
     * @param {NonConformityStatus | null} nonConformityStatus - New status, or null to clear.
     * @returns {void}
     * @since 1.0.0
     */
    setNonConformityStatus(nonConformityStatus: NonConformityStatus | null): void {
      patchState(store, { selectedNonConformityStatus: nonConformityStatus });
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
        const params = computed<
          OrganizationDashboardNonConformityTrendResourceParams | undefined
        >(() => {
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
            nonConformityStatus: store.selectedNonConformityStatus() ?? undefined,
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
 * Type OrganizationDashboardNonConformitiesOpenedStore
 * @type OrganizationDashboardNonConformitiesOpenedStore
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export type OrganizationDashboardNonConformitiesOpenedStore = InstanceType<
  typeof OrganizationDashboardNonConformitiesOpenedStore
>;


