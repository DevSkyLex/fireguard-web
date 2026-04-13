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
import { EMPTY, pipe, switchMap } from 'rxjs';
import {
  withQueryState,
  setPendingQuery,
  setSuccessQuery,
  setErrorQuery,
  toStoreError,
} from '@core/state/request-state';
import { OrganizationService } from '@features/organization/data-access';
import type { FacilityType } from '@features/organization/features/facilities/models';
import type {
  OrganizationDashboardFacilityTrendResourceParams,
  OrganizationDashboardGranularity,
  OrganizationDashboardTrendOutput,
} from '@features/organization/models';
import { ActiveOrganizationStore } from '@features/organization/state';
import type { MetricComparison } from '@shared/components/metric-card';
import {
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
 * Type FacilityTypeOption
 *
 * @description
 * Represents a single entry in the facility type select dropdown,
 * including a display icon.
 *
 * @since 1.0.0
 */
type FacilityTypeOption = {
  readonly label: string;
  readonly value: FacilityType;
  readonly icon: string;
};

/**
 * Type OrganizationDashboardFacilitiesCreatedSummaryMetric
 *
 * @description
 * Shape of a single summary metric tile displayed below the trend chart.
 *
 * @since 1.0.0
 */
type OrganizationDashboardFacilitiesCreatedSummaryMetric = {
  readonly label: string;
  readonly value: string;
  readonly icon: string | null;
  readonly comparison: MetricComparison | null;
};

/**
 * Type OrganizationDashboardFacilitiesCreatedState
 *
 * @description
 * Reactive state slice managed by
 * {@link OrganizationDashboardFacilitiesCreatedStore}.
 *
 * @since 1.0.0
 */
type OrganizationDashboardFacilitiesCreatedState = {
  readonly selectedGranularity: OrganizationDashboardGranularity;
  readonly selectedDateRange: Date[] | null;
  readonly compareEnabled: boolean;
  readonly selectedFacilityType: FacilityType | null;
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
 * Constant FACILITY_TYPE_OPTIONS
 * @readonly
 *
 * @description
 * Exhaustive list of selectable facility types used to filter the trend query,
 * each enriched with a PrimeIcons class.
 *
 * @since 1.0.0
 *
 * @type {FacilityTypeOption[]}
 */
const FACILITY_TYPE_OPTIONS: FacilityTypeOption[] = [
  { label: 'Site', value: 'site', icon: 'pi pi-map-marker' },
  { label: 'Building', value: 'building', icon: 'pi pi-building' },
  { label: 'Floor', value: 'floor', icon: 'pi pi-th-large' },
  { label: 'Zone', value: 'zone', icon: 'pi pi-stop' },
  { label: 'Area', value: 'area', icon: 'pi pi-table' },
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
 * @type {OrganizationDashboardFacilitiesCreatedState}
 */
const INITIAL_STATE: OrganizationDashboardFacilitiesCreatedState = {
  selectedGranularity: 'week',
  selectedDateRange: [new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1), new Date()],
  compareEnabled: true,
  selectedFacilityType: null,
};

/**
 * Store OrganizationDashboardFacilitiesCreatedStore
 * @const OrganizationDashboardFacilitiesCreatedStore
 *
 * @description
 * Component-scoped NgRx SignalStore for the **Facilities Created**
 * dashboard trend card. Manages facility-type filter state, fires the
 * `getDashboardFacilitiesCreatedTrend` API call reactively, and exposes
 * fully derived chart data and summary metrics.
 *
 * @example
 * ```typescript
 * @Component({ providers: [OrganizationDashboardFacilitiesCreatedStore] })
 * export class OrganizationDashboardFacilitiesCreatedTrend {
 *   protected readonly store = inject(OrganizationDashboardFacilitiesCreatedStore);
 * }
 * ```
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const OrganizationDashboardFacilitiesCreatedStore = signalStore(
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
  withState<OrganizationDashboardFacilitiesCreatedState>(INITIAL_STATE),
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
     * Computed facilityTypeOptions
     *
     * @description
     * Static list of facility-type selector options. Exposed as a computed
     * signal for uniform binding.
     *
     * @since 1.0.0
     */
    facilityTypeOptions: computed<FacilityTypeOption[]>(() => FACILITY_TYPE_OPTIONS),

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
     * Computed selectedFacilityTypeOption
     *
     * @description
     * Full option object matching the currently selected facility type.
     * Returns `null` when no type filter is active.
     *
     * @since 1.0.0
     */
    selectedFacilityTypeOption: computed<FacilityTypeOption | null>(
      () => FACILITY_TYPE_OPTIONS.find((o) => o.value === store.selectedFacilityType()) ?? null,
    ),

    /**
     * Computed summaryMetrics
     *
     * @description
     * KPI tile derived from the latest fetched dataset.
     * Includes facility-creation count with optional period-over-period comparison.
     *
     * @since 1.0.0
     */
    summaryMetrics: computed<readonly OrganizationDashboardFacilitiesCreatedSummaryMetric[]>(() => {
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
          label: 'Facilities Created',
          value: WHOLE_NUMBER_FMT.format(total),
          icon: 'pi pi-building',
          comparison: buildComparison(total, previousTotal),
        },
      ];
    }),

    /**
     * Computed chartData
     *
     * @description
     * Chart.js dataset built from the latest fetched data.
     * Renders a bar chart with an optional comparison dataset.
     *
     * @since 1.0.0
     */
    chartData: computed<ChartData<'bar'>>(() => {
      const trend = store.queryData();
      const compareEnabled = store.compareEnabled();

      const data: number[] = (trend?.series ?? []).map((p) =>
        Number(p['count'] ?? p['total'] ?? p['value'] ?? 0),
      );
      const comparisonData: number[] = (trend?.comparison?.series ?? []).map((p) =>
        Number(p['count'] ?? p['total'] ?? p['value'] ?? 0),
      );

      const datasets: ChartData<'bar'>['datasets'] = [
        {
          label: 'Facilities Created',
          data,
          backgroundColor: '#14b8a6',
          hoverBackgroundColor: '#0d9488',
        },
      ];

      if (compareEnabled && comparisonData.length > 0) {
        datasets.push({
          label: 'Previous Period',
          data: comparisonData,
          backgroundColor: '#99f6e4',
          hoverBackgroundColor: '#5eead4',
        });
      }

      return { labels: trend?.series.map(() => '') ?? [], datasets };
    }),

    /**
     * Computed chartOptions
     *
     * @description
     * Static Chart.js options object for the bar chart.
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
          barPercentage: 0.65,
          categoryPercentage: 0.8,
          borderRadius: 6,
          borderSkipped: 'start',
          borderWidth: 0,
        },
      },
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
     * NgRx `rxMethod` that fetches the facilities-created trend dataset
     * whenever the params signal emits a new value.
     * Undefined params are silently ignored via an `EMPTY` return.
     *
     * @since 1.0.0
     */
    load: rxMethod<OrganizationDashboardFacilityTrendResourceParams | undefined>(
      pipe(
        switchMap((params) => {
          if (!params) return EMPTY;

          patchState(store, setPendingQuery());

          return organizationService
            .getDashboardFacilitiesCreatedTrend(params.organizationId, {
              granularity: params.granularity,
              from: params.from,
              to: params.to,
              compare: params.compare,
              facilityType: params.facilityType,
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
     * Method setFacilityType
     *
     * @description
     * Updates the active facility-type filter. Triggers a new fetch.
     *
     * @param {FacilityType | null} facilityType - New facility type, or null to clear.
     * @returns {void}
     * @since 1.0.0
     */
    setFacilityType(facilityType: FacilityType | null): void {
      patchState(store, { selectedFacilityType: facilityType });
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
        const params = computed<OrganizationDashboardFacilityTrendResourceParams | undefined>(
          () => {
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
              facilityType: store.selectedFacilityType() ?? undefined,
            };
          },
        );

        store.load(params);
      },
    };
  }),
  //#endregion
);

/**
 * Type OrganizationDashboardFacilitiesCreatedStore
 * @type OrganizationDashboardFacilitiesCreatedStore
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export type OrganizationDashboardFacilitiesCreatedStore = InstanceType<
  typeof OrganizationDashboardFacilitiesCreatedStore
>;
