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
import type { FacilityType } from '@features/organization/features/facilities/models';
import type {
  OrganizationDashboardEquipmentStatus,
  OrganizationDashboardEquipmentType,
  OrganizationDashboardGranularity,
  OrganizationDashboardTrendOutput,
  OrganizationDashboardTrendResourceParams,
} from '@features/organization/models';
import { ActiveOrganizationStore } from '@features/organization/state';
import type { MetricComparison } from '@shared/components/metric-card';
import {
  alignDashboardTrendSeries,
  getDashboardTrendPointValue,
  sumDashboardTrendValues,
} from '../../../data-access/adapters/organization-dashboard-trend.adapter';

const toIsoString = (value: Date | undefined): string | undefined => value?.toISOString();

/**
 * Type EquipmentStatusOption
 * @type EquipmentStatusOption
 *
 * @description
 * Shape of a single equipment-status filter option exposed by the store
 * for consumption in the select dropdown.
 *
 * @since 1.0.0
 */
type EquipmentStatusOption = {
  readonly label: string;
  readonly value: OrganizationDashboardEquipmentStatus;
  readonly icon: string;
  readonly color: string;
};

/**
 * Type FacilityTypeOption
 * @type FacilityTypeOption
 *
 * @description
 * Shape of a single facility-type filter option exposed by the store
 * for consumption in the select dropdown.
 *
 * @since 1.0.0
 */
type FacilityTypeOption = {
  readonly label: string;
  readonly value: FacilityType;
  readonly icon: string;
};

/**
 * Type GranularityOption
 * @type GranularityOption
 *
 * @description
 * Shape of a single granularity option used in the period selector.
 *
 * @since 1.0.0
 */
type GranularityOption = {
  readonly label: string;
  readonly value: OrganizationDashboardGranularity;
};

/**
 * Type EquipmentTypeOption
 * @type EquipmentTypeOption
 *
 * @description
 * Shape of a single equipment-type filter option used in the select dropdown.
 *
 * @since 1.0.0
 */
type EquipmentTypeOption = {
  readonly label: string;
  readonly value: OrganizationDashboardEquipmentType;
};

/**
 * Type OrganizationDashboardAssetGrowthData
 * @type OrganizationDashboardAssetGrowthData
 *
 * @description
 * Combined payload returned by the parallel equipment + facilities
 * trend requests. Stored in state after a successful {@link load} call.
 *
 * @since 1.0.0
 */
type OrganizationDashboardAssetGrowthData = {
  readonly equipment: OrganizationDashboardTrendOutput;
  readonly facilities: OrganizationDashboardTrendOutput;
};

/**
 * Type OrganizationDashboardAssetGrowthParams
 * @type OrganizationDashboardAssetGrowthParams
 *
 * @description
 * Parameters forwarded to the API on each load. Extends the base
 * trend resource params with equipment and facility dimension filters.
 *
 * @since 1.0.0
 */
type OrganizationDashboardAssetGrowthParams = OrganizationDashboardTrendResourceParams & {
  readonly equipmentType?: OrganizationDashboardEquipmentType;
  readonly equipmentStatus?: OrganizationDashboardEquipmentStatus;
  readonly facilityType?: FacilityType;
};

/**
 * Type OrganizationDashboardAssetGrowthSummaryMetric
 * @type OrganizationDashboardAssetGrowthSummaryMetric
 *
 * @description
 * Shape of a single KPI tile rendered above the chart.
 * The {@link comparison} field is null when compare mode is disabled
 * or the metric does not support period-over-period comparison.
 *
 * @since 1.0.0
 */
type OrganizationDashboardAssetGrowthSummaryMetric = {
  readonly label: string;
  readonly value: string;
  readonly icon: string | null;
  readonly comparison: MetricComparison | null;
};

/**
 * Type OrganizationDashboardAssetGrowthState
 * @type OrganizationDashboardAssetGrowthState
 *
 * @description
 * Full state slice managed by
 * {@link OrganizationDashboardAssetGrowthStore}. All keys become
 * deeply-signal-wrapped by NgRx Signals' `withState`.
 *
 * @since 1.0.0
 */
type OrganizationDashboardAssetGrowthState = {
  /** Whether a network request is currently in flight. */
  /** Last successfully fetched dataset, or null before the first load. */
  /** Active time granularity forwarded to both API calls. */
  readonly selectedGranularity: OrganizationDashboardGranularity;
  /** Active date-range filter as a two-element [from, to] array, or null. */
  readonly selectedDateRange: Date[] | null;
  /** Whether previous-period comparison mode is active. */
  readonly compareEnabled: boolean;
  /** Optional equipment-type dimension filter. */
  readonly selectedEquipmentType: OrganizationDashboardEquipmentType | null;
  /** Optional equipment-status dimension filter. */
  readonly selectedEquipmentStatus: OrganizationDashboardEquipmentStatus | null;
  /** Optional facility-type dimension filter. */
  readonly selectedFacilityType: FacilityType | null;
};

/**
 * Constant GRANULARITY_OPTIONS
 * @const GRANULARITY_OPTIONS
 *
 * @description
 * Ordered list of time-granularity options shared across the component
 * and exposed via the store for consumption in the granularity selector.
 *
 * @since 1.0.0
 */
const GRANULARITY_OPTIONS: GranularityOption[] = [
  { label: 'Daily', value: 'day' },
  { label: 'Weekly', value: 'week' },
  { label: 'Monthly', value: 'month' },
];

/**
 * Constant EQUIPMENT_TYPE_OPTIONS
 * @const EQUIPMENT_TYPE_OPTIONS
 *
 * @description
 * Full list of equipment-type dimension filter options.
 *
 * @since 1.0.0
 */
const EQUIPMENT_TYPE_OPTIONS: EquipmentTypeOption[] = [
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
 * Constant EQUIPMENT_STATUS_OPTIONS
 * @const EQUIPMENT_STATUS_OPTIONS
 *
 * @description
 * Full list of equipment-status dimension filter options, each enriched
 * with a PrimeIcons class and a hex accent color for the dropdown item
 * template.
 *
 * @since 1.0.0
 */
const EQUIPMENT_STATUS_OPTIONS: EquipmentStatusOption[] = [
  { label: 'In Stock', value: 'in_stock', icon: 'pi pi-box', color: '#94a3b8' },
  {
    label: 'Operational',
    value: 'operational',
    icon: 'pi pi-check-circle',
    color: '#22c55e',
  },
  {
    label: 'Under Maintenance',
    value: 'under_maintenance',
    icon: 'pi pi-wrench',
    color: '#f97316',
  },
  {
    label: 'Decommissioned',
    value: 'decommissioned',
    icon: 'pi pi-ban',
    color: '#ef4444',
  },
];

/**
 * Constant FACILITY_TYPE_OPTIONS
 * @const FACILITY_TYPE_OPTIONS
 *
 * @description
 * Full list of facility-type dimension filter options, each enriched
 * with a PrimeIcons class for the dropdown item template.
 *
 * @since 1.0.0
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
 * @const WHOLE_NUMBER_FMT
 *
 * @description
 * Shared `Intl.NumberFormat` instance that formats counts as whole
 * en-US numbers with no decimal digits. Created once at module level
 * to avoid per-computation allocations.
 *
 * @since 1.0.0
 */
const WHOLE_NUMBER_FMT = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
});

/**
 * Constant DECIMAL_FMT
 * @const DECIMAL_FMT
 *
 * @description
 * Shared `Intl.NumberFormat` instance that formats ratio values with
 * one decimal digit (e.g. "2.7x"). Created once at module level.
 *
 * @since 1.0.0
 */
const DECIMAL_FMT = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 1,
});

//#region Initial State

/**
 * Constant INITIAL_STATE
 * @const INITIAL_STATE
 *
 * @description
 * Seed value for {@link OrganizationDashboardAssetGrowthStore}'s state.
 * The default date range covers the last calendar month through today.
 *
 * @since 1.0.0
 */
const INITIAL_STATE: OrganizationDashboardAssetGrowthState = {
  selectedGranularity: 'week',
  selectedDateRange: [new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1), new Date()],
  compareEnabled: true,
  selectedEquipmentType: null,
  selectedEquipmentStatus: null,
  selectedFacilityType: null,
};

//#endregion

/**
 * Store OrganizationDashboardAssetGrowthStore
 * @const OrganizationDashboardAssetGrowthStore
 *
 * @description
 * Component-scoped NgRx SignalStore for the **Asset Growth Momentum**
 * dashboard card. Manages filter state, orchestrates parallel API calls
 * for equipment-created and facilities-created trends, and exposes
 * fully derived chart data and summary KPI metrics as computed signals.
 *
 * Designed to be provided at **component level** (`providers: [OrganizationDashboardAssetGrowthStore]`),
 * so each card instance owns an independent, lifecycle-bound copy of the store.
 *
 * ### Reactive load flow
 * On `onInit`, a `computed` signal is built from all filter-state signals and
 * passed to {@link load} via `rxMethod`. Angular's effect system re-evaluates
 * the computed whenever any dependency changes, automatically triggering a new
 * parallel fetch without any imperative coordination in the component.
 *
 * @example
 * ```typescript
 * @Component({ providers: [OrganizationDashboardAssetGrowthStore] })
 * export class OrganizationDashboardAssetGrowthTrend {
 *   protected readonly store = inject(OrganizationDashboardAssetGrowthStore);
 * }
 * ```
 *
 * @version 2.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const OrganizationDashboardAssetGrowthStore = signalStore(
  //#region State

  /**
   * Feature withState
   *
   * @description
   * Seeds the store with the initial filter state and async-operation
   * flags. All keys become deeply-signal-wrapped `SignalState` entries
   * that expose typed read signals on the store instance.
   *
   * @since 2.0.0
   */
  withQueryState<OrganizationDashboardAssetGrowthData>(),
  withState<OrganizationDashboardAssetGrowthState>(INITIAL_STATE),

  //#endregion

  //#region Computed

  /**
   * Feature withComputed
   *
   * @description
   * Adds derived read-only signals on top of the raw state signals.
   * All computeds re-evaluate lazily whenever their signal dependencies change.
   *
   * @since 2.0.0
   */
  withComputed((store) => ({
    /**
     * Computed granularityOptions
     *
     * @description
     * Static list of granularity selector options. Exposed as a computed
     * signal so consumers can bind to it uniformly via `store.*()`.
     *
     * @since 2.0.0
     */
    granularityOptions: computed<GranularityOption[]>(() => GRANULARITY_OPTIONS),

    /**
     * Computed equipmentTypeOptions
     *
     * @description
     * Static list of equipment-type filter options.
     *
     * @since 2.0.0
     */
    equipmentTypeOptions: computed<EquipmentTypeOption[]>(() => EQUIPMENT_TYPE_OPTIONS),

    /**
     * Computed equipmentStatusOptions
     *
     * @description
     * Static list of equipment-status filter options, each enriched with
     * icon and color metadata for the custom dropdown item template.
     *
     * @since 2.0.0
     */
    equipmentStatusOptions: computed<EquipmentStatusOption[]>(() => EQUIPMENT_STATUS_OPTIONS),

    /**
     * Computed facilityTypeOptions
     *
     * @description
     * Static list of facility-type filter options.
     *
     * @since 2.0.0
     */
    facilityTypeOptions: computed<FacilityTypeOption[]>(() => FACILITY_TYPE_OPTIONS),

    /**
     * Computed maxRangeDays
     *
     * @description
     * Maximum selectable date-range in days, derived from the active
     * granularity. Prevents the user from selecting a range that would
     * produce an unreasonable number of data points.
     *
     * Daily: 90 — Weekly: 365 — Monthly: 730
     *
     * @since 2.0.0
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
     * Computed selectedEquipmentStatusOption
     *
     * @description
     * Full option object for the currently selected equipment-status value,
     * providing the icon and color metadata needed by the dropdown's
     * selected-item template.
     * Returns null when no status filter is active.
     *
     * @since 2.0.0
     */
    selectedEquipmentStatusOption: computed<EquipmentStatusOption | null>(
      () =>
        EQUIPMENT_STATUS_OPTIONS.find(
          (option) => option.value === store.selectedEquipmentStatus(),
        ) ?? null,
    ),

    /**
     * Computed selectedFacilityTypeOption
     *
     * @description
     * Full option object for the currently selected facility-type value,
     * providing the icon metadata needed by the dropdown's selected-item
     * template. Returns null when no type filter is active.
     *
     * @since 2.0.0
     */
    selectedFacilityTypeOption: computed<FacilityTypeOption | null>(
      () =>
        FACILITY_TYPE_OPTIONS.find((option) => option.value === store.selectedFacilityType()) ??
        null,
    ),

    /**
     * Computed summaryMetrics
     *
     * @description
     * Four KPI tiles derived from the latest fetched dataset:
     * **Equipment Added**, **Facilities Added**, **Combined Growth**, and
     * **Equipment / Facility** ratio. Period-over-period comparison deltas
     * are included when {@link compareEnabled} is `true`; null otherwise.
     *
     * @since 2.0.0
     */
    summaryMetrics: computed<readonly OrganizationDashboardAssetGrowthSummaryMetric[]>(() => {
      const growth = store.queryData();
      const compareEnabled = store.compareEnabled();

      const equipmentSeries = growth?.equipment?.series ?? [];
      const facilitySeries = growth?.facilities?.series ?? [];

      const equipmentTotal = sumDashboardTrendValues(
        equipmentSeries.map((point) => getDashboardTrendPointValue(point)),
      );
      const facilityTotal = sumDashboardTrendValues(
        facilitySeries.map((point) => getDashboardTrendPointValue(point)),
      );
      const previousEquipmentTotal = sumDashboardTrendValues(
        (growth?.equipment?.comparison?.series ?? []).map((point) =>
          getDashboardTrendPointValue(point),
        ),
      );
      const previousFacilityTotal = sumDashboardTrendValues(
        (growth?.facilities?.comparison?.series ?? []).map((point) =>
          getDashboardTrendPointValue(point),
        ),
      );
      const assetsPerFacility =
        facilityTotal > 0 ? Number((equipmentTotal / facilityTotal).toFixed(1)) : 0;

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

        if (delta === 0) {
          return { value: 'Flat', direction: null };
        }

        return {
          value: `${delta > 0 ? '+' : ''}${WHOLE_NUMBER_FMT.format(delta)}`,
          direction: delta > 0 ? 'up' : 'down',
        };
      };

      return [
        {
          label: 'Equipment Added',
          value: WHOLE_NUMBER_FMT.format(equipmentTotal),
          icon: 'pi pi-shield',
          comparison: buildComparison(equipmentTotal, previousEquipmentTotal),
        },
        {
          label: 'Facilities Added',
          value: WHOLE_NUMBER_FMT.format(facilityTotal),
          icon: 'pi pi-building',
          comparison: buildComparison(facilityTotal, previousFacilityTotal),
        },
        {
          label: 'Combined Growth',
          value: WHOLE_NUMBER_FMT.format(equipmentTotal + facilityTotal),
          icon: 'pi pi-arrow-up-right',
          comparison: buildComparison(
            equipmentTotal + facilityTotal,
            previousEquipmentTotal + previousFacilityTotal,
          ),
        },
        {
          label: 'Equipment / Facility',
          value: `${DECIMAL_FMT.format(assetsPerFacility)}x`,
          icon: 'pi pi-percentage',
          comparison: null,
        },
      ];
    }),

    /**
     * Computed chartData
     *
     * @description
     * Chart.js bar-chart dataset built from the latest fetched data.
     * Adds up to two additional semi-transparent datasets when
     * {@link compareEnabled} is `true` and comparison series are present.
     *
     * @since 2.0.0
     */
    chartData: computed<ChartData<'bar'>>(() => {
      const growth = store.queryData();
      const compareEnabled = store.compareEnabled();

      const aligned = alignDashboardTrendSeries(
        [growth?.equipment?.series, growth?.facilities?.series],
        store.selectedGranularity(),
      );
      const [equipmentData = [], facilityData = []] = aligned.datasets;

      const datasets: ChartData<'bar'>['datasets'] = [
        {
          label: 'Equipment Created',
          data: equipmentData,
          backgroundColor: '#8b5cf6',
          hoverBackgroundColor: '#7c3aed',
        },
        {
          label: 'Facilities Created',
          data: facilityData,
          backgroundColor: '#14b8a6',
          hoverBackgroundColor: '#0d9488',
        },
      ];

      const equipmentComparisonData = (growth?.equipment?.comparison?.series ?? []).map((point) =>
        getDashboardTrendPointValue(point),
      );
      const facilityComparisonData = (growth?.facilities?.comparison?.series ?? []).map((point) =>
        getDashboardTrendPointValue(point),
      );

      if (compareEnabled && equipmentComparisonData.length > 0) {
        datasets.push({
          label: 'Equipment Previous Period',
          data: equipmentComparisonData,
          backgroundColor: '#c4b5fd',
          hoverBackgroundColor: '#a78bfa',
        });
      }

      if (compareEnabled && facilityComparisonData.length > 0) {
        datasets.push({
          label: 'Facilities Previous Period',
          data: facilityComparisonData,
          backgroundColor: '#99f6e4',
          hoverBackgroundColor: '#5eead4',
        });
      }

      return {
        labels: [...aligned.labels],
        datasets,
      };
    }),

    /**
     * Computed chartOptions
     *
     * @description
     * Static Chart.js options object for the grouped bar chart.
     * Wrapped in `computed` for API uniformity with other store signals.
     *
     * @since 2.0.0
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
   * @since 2.0.0
   */
  withMethods((store, organizationService = inject(OrganizationService)) => ({
    /**
     * Method load
     *
     * @description
     * NgRx `rxMethod` that fetches both trend datasets in parallel whenever
     * the params signal emits a new value. Undefined params (no organization
     * selected or SSR context) are silently ignored via early `EMPTY` return.
     *
     * Sets {@link isLoading} to `true` before dispatching the requests and
     * resets it — alongside updating {@link data} — in both the success and
     * error branches via `tapResponse`.
     *
     * @since 2.0.0
     */
    load: rxMethod<OrganizationDashboardAssetGrowthParams | undefined>(
      pipe(
        switchMap((params) => {
          if (!params) return EMPTY;

          patchState(store, setPendingQuery());

          return forkJoin({
            equipment: organizationService.getDashboardEquipmentCreatedTrend(
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
            facilities: organizationService.getDashboardFacilitiesCreatedTrend(
              params.organizationId,
              {
                granularity: params.granularity,
                from: params.from,
                to: params.to,
                compare: params.compare,
                facilityType: params.facilityType,
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
     * Updates the active time granularity. The reactive load flow in
     * `withHooks` detects the state change and triggers a new fetch.
     *
     * @param {OrganizationDashboardGranularity} granularity - New granularity.
     * @returns {void}
     *
     * @since 2.0.0
     */
    setGranularity(granularity: OrganizationDashboardGranularity): void {
      patchState(store, { selectedGranularity: granularity });
    },

    /**
     * Method setDateRange
     *
     * @description
     * Updates the active date range after clamping the `to` boundary
     * whenever the span exceeds {@link maxRangeDays} for the current
     * granularity. Incomplete ranges (fewer than two non-null dates)
     * are stored as-is without clamping.
     *
     * @param {Date[] | null} range - New date range, or null to clear the filter.
     * @returns {void}
     *
     * @since 2.0.0
     */
    setDateRange(range: Date[] | null): void {
      if (!range || range.length < 2 || !range[0] || !range[1]) {
        patchState(store, { selectedDateRange: range });
        return;
      }

      const [from, to] = range;
      const maxMs = store.maxRangeDays() * 24 * 60 * 60 * 1000;

      if (to.getTime() - from.getTime() > maxMs) {
        patchState(store, {
          selectedDateRange: [from, new Date(from.getTime() + maxMs)],
        });
        return;
      }

      patchState(store, { selectedDateRange: range });
    },

    /**
     * Method setCompareEnabled
     *
     * @description
     * Enables or disables previous-period comparison mode. When toggled
     * off, the `summaryMetrics` and `chartData` computeds automatically
     * drop comparison data on their next evaluation.
     *
     * @param {boolean} compareEnabled - New compare-mode state.
     * @returns {void}
     *
     * @since 2.0.0
     */
    setCompareEnabled(compareEnabled: boolean): void {
      patchState(store, { compareEnabled });
    },

    /**
     * Method setEquipmentType
     *
     * @description
     * Updates the optional equipment-type dimension filter.
     *
     * @param {OrganizationDashboardEquipmentType | null} equipmentType - New filter value, or null.
     * @returns {void}
     *
     * @since 2.0.0
     */
    setEquipmentType(equipmentType: OrganizationDashboardEquipmentType | null): void {
      patchState(store, { selectedEquipmentType: equipmentType });
    },

    /**
     * Method setEquipmentStatus
     *
     * @description
     * Updates the optional equipment-status dimension filter.
     *
     * @param {OrganizationDashboardEquipmentStatus | null} equipmentStatus - New filter value, or null.
     * @returns {void}
     *
     * @since 2.0.0
     */
    setEquipmentStatus(equipmentStatus: OrganizationDashboardEquipmentStatus | null): void {
      patchState(store, { selectedEquipmentStatus: equipmentStatus });
    },

    /**
     * Method setFacilityType
     *
     * @description
     * Updates the optional facility-type dimension filter.
     *
     * @param {FacilityType | null} facilityType - New filter value, or null.
     * @returns {void}
     *
     * @since 2.0.0
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
   * Wires the reactive reload pipeline on `onInit`. A `computed` signal
   * is derived from all filter-state signals; any state change causes the
   * computed to emit a new value, which `rxMethod` picks up via Angular's
   * internal effect subscription to fire a new fetch automatically.
   *
   * @since 2.0.0
   */
  withHooks((store) => {
    const platformId = inject(PLATFORM_ID);
    const activeOrganizationStore = inject(ActiveOrganizationStore);

    return {
      /**
       * Hook onInit
       *
       * @description
       * Builds the params `computed` from all filter-state signals and
       * passes it to {@link load}. NgRx subscribes to the computed via
       * an internal effect, so any downstream filter change automatically
       * triggers a fresh parallel fetch.
       *
       * @returns {void}
       *
       * @since 2.0.0
       */
      onInit(): void {
        const params = computed<OrganizationDashboardAssetGrowthParams | undefined>(() => {
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
            equipmentType: store.selectedEquipmentType() ?? undefined,
            equipmentStatus: store.selectedEquipmentStatus() ?? undefined,
            facilityType: store.selectedFacilityType() ?? undefined,
          };
        });

        store.load(params);
      },
    };
  }),

  //#endregion
);

/**
 * Type OrganizationDashboardAssetGrowthStore
 * @type OrganizationDashboardAssetGrowthStore
 *
 * @description
 * Instance type of the {@link OrganizationDashboardAssetGrowthStore}
 * signal store. Use this type for constructor-parameter and property
 * type annotations throughout the dashboard card component and its tests.
 *
 * @version 2.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export type OrganizationDashboardAssetGrowthStore = InstanceType<
  typeof OrganizationDashboardAssetGrowthStore
>;
