import { computed } from '@angular/core';
import {
  patchState,
  signalStoreFeature,
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

export type DashboardFilterState = {
  readonly selectedGranularity: OrganizationDashboardGranularity;
  readonly selectedDateRange: Date[] | null;
  readonly compareEnabled: boolean;
};

export type DashboardFilterDraftState = {
  readonly isFilterDrawerVisible: boolean;
  readonly draftDateRange: Date[] | null;
  readonly draftCompareEnabled: boolean;
};

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

export function countDefinedDashboardFilters(values: readonly unknown[]): number {
  return values.reduce<number>((count, value) => {
    if (value === null || value === undefined || value === '') {
      return count;
    }

    return count + 1;
  }, 0);
}

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

export function getDashboardInitialFilterDraftState(): DashboardFilterDraftState {
  return {
    isFilterDrawerVisible: false,
    draftDateRange: getDashboardInitialDateRange(),
    draftCompareEnabled: true,
  };
}

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

export function buildDashboardTrendBaseParams(store: {
  readonly selectedGranularity: () => OrganizationDashboardGranularity;
  readonly selectedDateRange: () => Date[] | null;
  readonly compareEnabled: () => boolean;
}): Omit<OrganizationDashboardTrendResourceParams, 'organizationId'> | null {
  const range = store.selectedDateRange();
  if (range !== null && (range.length < 2 || !range[1])) return null;
  return {
    granularity: store.selectedGranularity(),
    from: toIsoString(range?.[0]),
    to: toIsoString(range?.[1]),
    compare: store.compareEnabled() || undefined,
  };
}
