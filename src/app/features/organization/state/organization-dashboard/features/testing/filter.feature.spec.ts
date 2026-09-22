import { TestBed } from '@angular/core/testing';
import { signalStore } from '@ngrx/signals';
import { buildDashboardTrendBaseParams, withDashboardFilterState } from '../filter.feature';

const FilterStore = signalStore(withDashboardFilterState());

describe('buildDashboardTrendBaseParams', () => {
  let store: InstanceType<typeof FilterStore>;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [FilterStore] });
    store = TestBed.inject(FilterStore);
  });

  it('reads the applied filter feature signals as trend query parameters', () => {
    const from = new Date('2026-09-01T12:00:00Z');
    const to = new Date('2026-09-15T12:00:00Z');
    store.setGranularity('day');
    store.setDateRange([from, to]);

    expect(buildDashboardTrendBaseParams(store)).toEqual({
      granularity: 'day',
      from: from.toISOString(),
      to: to.toISOString(),
      compare: true,
    });
  });

  it('defers queries for empty and partially selected periods', () => {
    store.setDateRange([]);
    expect(buildDashboardTrendBaseParams(store)).toBeNull();

    const from = new Date('2026-09-01T12:00:00Z');
    store.setDateRange([from]);
    expect(buildDashboardTrendBaseParams(store)).toBeNull();

    const to = new Date('2026-09-15T12:00:00Z');
    store.setDateRange([from, to]);
    expect(buildDashboardTrendBaseParams(store)).toEqual({
      granularity: 'week',
      from: from.toISOString(),
      to: to.toISOString(),
      compare: true,
    });
  });

  it('omits period bounds and comparison when the applied filters disable them', () => {
    store.setDateRange(null);
    store.setCompareEnabled(false);
    expect(buildDashboardTrendBaseParams(store)).toEqual({
      granularity: 'week',
      from: undefined,
      to: undefined,
      compare: undefined,
    });
  });
});
