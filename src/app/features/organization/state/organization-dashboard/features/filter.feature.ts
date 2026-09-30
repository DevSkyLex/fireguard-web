import { computed } from '@angular/core';
import {
  patchState,
  signalStoreFeature,
  type SignalStoreFeatureType,
  type StateSignals,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';
import type {
  OrganizationDashboardGranularity,
  OrganizationDashboardTrendResourceParams,
} from '@features/organization/models';
import type { GranularityOption } from '../models';
import { GRANULARITY_OPTIONS, getDashboardInitialDateRange, toIsoString } from '../utils';

/**
 * Type DashboardFilterState
 *
 * @description
 * Applied filter values shared by the dashboard controls and trend queries.
 *
 * @since 0.1.0
 *
 * @type DashboardFilterState
 */
export type DashboardFilterState = {
  /**
   * Property selectedGranularity
   * @readonly
   *
   * @description
   * Controls the bucket size and maximum date span used by trend queries.
   *
   * @access public
   * @since 0.1.0
   *
   * @type {OrganizationDashboardGranularity}
   */
  readonly selectedGranularity: OrganizationDashboardGranularity;

  /**
   * Property selectedDateRange
   * @readonly
   *
   * @description
   * Holds the applied date boundaries, or null when no range is selected.
   *
   * @access public
   * @since 0.1.0
   *
   * @type {Date[] | null}
   */
  readonly selectedDateRange: Date[] | null;

  /**
   * Property compareEnabled
   * @readonly
   *
   * @description
   * Enables the comparison period for dashboard trend data.
   *
   * @access public
   * @since 0.1.0
   *
   * @type {boolean}
   */
  readonly compareEnabled: boolean;
};

/**
 * Type DashboardFilterDraftState
 *
 * @description
 * Unapplied filter controls retained while the filter drawer is being edited.
 *
 * @since 0.1.0
 *
 * @type DashboardFilterDraftState
 */
export type DashboardFilterDraftState = {
  /**
   * Property isFilterDrawerVisible
   * @readonly
   *
   * @description
   * Controls whether the filter editing drawer is open.
   *
   * @access public
   * @since 0.1.0
   *
   * @type {boolean}
   */
  readonly isFilterDrawerVisible: boolean;

  /**
   * Property draftDateRange
   * @readonly
   *
   * @description
   * Keeps edited date boundaries separate until the operator applies them.
   *
   * @access public
   * @since 0.1.0
   *
   * @type {Date[] | null}
   */
  readonly draftDateRange: Date[] | null;

  /**
   * Property draftCompareEnabled
   * @readonly
   *
   * @description
   * Keeps the edited comparison choice separate until filters are applied.
   *
   * @access public
   * @since 0.1.0
   *
   * @type {boolean}
   */
  readonly draftCompareEnabled: boolean;
};

/**
 * Function getDashboardMaxRangeDays
 *
 * @description
 * Returns the maximum date span allowed for the selected trend granularity.
 *
 * @access public
 * @since 0.1.0
 *
 * @param {OrganizationDashboardGranularity} granularity - Active trend bucket size.
 *
 * @returns {number} Maximum inclusive-range span in days.
 */
export function getDashboardMaxRangeDays(granularity: OrganizationDashboardGranularity): number {
  switch (granularity) {
    case 'day':
      return 90;
    case 'month':
      return 730;
    default:
      return 365;
  }
}

/**
 * Function cloneDashboardDateRange
 *
 * @description
 * Copies each valid Date value so draft editing cannot mutate the applied range.
 *
 * @access public
 * @since 0.1.0
 *
 * @param {Date[] | null} range - Current range or null when no range is set.
 *
 * @returns {Date[] | null} Independent date values, preserving a null input.
 */
export function cloneDashboardDateRange(range: Date[] | null): Date[] | null {
  if (!range) {
    return null;
  }

  return range.reduce<Date[]>((clonedRange, value) => {
    if (value instanceof Date) {
      clonedRange.push(new Date(value));
    }

    return clonedRange;
  }, []);
}

/**
 * Function normalizeDashboardDateRange
 *
 * @description
 * Clones a range and caps complete ranges to the span supported by its granularity.
 *
 * @access public
 * @since 0.1.0
 *
 * @param {Date[] | null} range - Candidate date boundaries.
 * @param {OrganizationDashboardGranularity} granularity - Active trend bucket size.
 *
 * @returns {Date[] | null} A cloned range capped to the allowed span.
 */
export function normalizeDashboardDateRange(
  range: Date[] | null,
  granularity: OrganizationDashboardGranularity,
): Date[] | null {
  if (!range || range.length < 2 || !range[0] || !range[1]) {
    return cloneDashboardDateRange(range);
  }

  const [from, to] = range;
  const maxMs = getDashboardMaxRangeDays(granularity) * 24 * 60 * 60 * 1000;

  if (to.getTime() - from.getTime() > maxMs) {
    return [new Date(from), new Date(from.getTime() + maxMs)];
  }

  return [new Date(from), new Date(to)];
}

/**
 * Function countDefinedDashboardFilters
 *
 * @description
 * Counts active filter values while ignoring null, undefined and empty strings.
 *
 * @access public
 * @since 0.1.0
 *
 * @param {readonly unknown[]} values - Current filter values.
 *
 * @returns {number} Number of values treated as active.
 */
export function countDefinedDashboardFilters(values: readonly unknown[]): number {
  return values.reduce<number>((count, value) => {
    if (value === null || value === undefined || value === '') {
      return count;
    }

    return count + 1;
  }, 0);
}

/**
 * Function isDashboardDefaultDateRange
 *
 * @description
 * Compares the range's calendar days with the configured initial dashboard range.
 *
 * @access public
 * @since 0.1.0
 *
 * @param {Date[] | null} range - Candidate date boundaries.
 *
 * @returns {boolean} Whether both boundary dates match the initial range.
 */
export function isDashboardDefaultDateRange(range: Date[] | null): boolean {
  if (!range || range.length < 2 || !range[0] || !range[1]) {
    return false;
  }

  const [expectedFrom, expectedTo] = getDashboardInitialDateRange();
  const [from, to] = range;

  return (
    from.getFullYear() === expectedFrom.getFullYear() &&
    from.getMonth() === expectedFrom.getMonth() &&
    from.getDate() === expectedFrom.getDate() &&
    to.getFullYear() === expectedTo.getFullYear() &&
    to.getMonth() === expectedTo.getMonth() &&
    to.getDate() === expectedTo.getDate()
  );
}

/**
 * Function getDashboardBaseActiveFilterCount
 *
 * @description
 * Counts the date-range and comparison choices that differ from their defaults.
 *
 * @access public
 * @since 0.1.0
 *
 * @param {Date[] | null} dateRange - Applied date boundaries.
 * @param {boolean} compareEnabled - Whether comparison is currently enabled.
 *
 * @returns {number} Number of active non-default base filters.
 */
export function getDashboardBaseActiveFilterCount(
  dateRange: Date[] | null,
  compareEnabled: boolean,
): number {
  let activeFilterCount = 0;

  if (!isDashboardDefaultDateRange(dateRange)) {
    activeFilterCount += 1;
  }

  if (!compareEnabled) {
    activeFilterCount += 1;
  }

  return activeFilterCount;
}

/**
 * Function getDashboardInitialFilterDraftState
 *
 * @description
 * Creates a closed draft drawer initialized from the dashboard's default range.
 *
 * @access public
 * @since 0.1.0
 *
 * @returns {DashboardFilterDraftState} Initial draft controls for the filter drawer.
 */
export function getDashboardInitialFilterDraftState(): DashboardFilterDraftState {
  return {
    isFilterDrawerVisible: false,
    draftDateRange: getDashboardInitialDateRange(),
    draftCompareEnabled: true,
  };
}

/**
 * Function withDashboardFilterState
 *
 * @description
 * Adds applied dashboard filters, derived range constraints and their update methods to a store.
 *
 * @access public
 * @since 0.1.0
 *
 * @returns A SignalStore feature containing the dashboard filter state and methods.
 */
export function withDashboardFilterState() {
  return signalStoreFeature(
    withState<DashboardFilterState>({
      selectedGranularity: 'week',
      selectedDateRange: getDashboardInitialDateRange(),
      compareEnabled: true,
    }),
    withComputed((store) => ({
      granularityOptions: computed<GranularityOption[]>(() => [...GRANULARITY_OPTIONS]),
      maxRangeDays: computed<number>(() => getDashboardMaxRangeDays(store.selectedGranularity())),
    })),
    withMethods((store) => ({
      setGranularity(granularity: OrganizationDashboardGranularity): void {
        patchState(store, { selectedGranularity: granularity });
      },
      setDateRange(range: Date[] | null): void {
        patchState(store, {
          selectedDateRange: normalizeDashboardDateRange(range, store.selectedGranularity()),
        });
      },
      setCompareEnabled(compareEnabled: boolean): void {
        patchState(store, { compareEnabled });
      },
    })),
  );
}

/**
 * Type DashboardFilterSignals
 *
 * @description
 * Read contract derived from the owning filter feature's state.
 *
 * @type DashboardFilterSignals
 */
type DashboardFilterSignals = StateSignals<
  SignalStoreFeatureType<typeof withDashboardFilterState>['state']
>;

/**
 * Function buildDashboardTrendBaseParams
 *
 * @description
 * Converts applied filter signals to trend parameters; incomplete periods defer queries.
 *
 * @param {DashboardFilterSignals} store - The owning dashboard filter signals.
 *
 * @returns {Omit<OrganizationDashboardTrendResourceParams, 'organizationId'> | null} Query
 *   parameters or an incomplete-period sentinel.
 */
export function buildDashboardTrendBaseParams(
  store: DashboardFilterSignals,
): Omit<OrganizationDashboardTrendResourceParams, 'organizationId'> | null {
  const range = store.selectedDateRange();
  if (range !== null && (range.length < 2 || !range[1])) return null;
  return {
    granularity: store.selectedGranularity(),
    from: toIsoString(range?.[0]),
    to: toIsoString(range?.[1]),
    compare: store.compareEnabled() || undefined,
  };
}
