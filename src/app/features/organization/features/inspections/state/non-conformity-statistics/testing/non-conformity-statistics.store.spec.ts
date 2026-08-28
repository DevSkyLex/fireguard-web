import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { InspectionService } from '@features/organization/features/inspections/data-access';
import type { NonConformityStatisticsOutput } from '@features/organization/features/inspections/models';
import { NonConformityStatisticsStore } from '../non-conformity-statistics.store';

const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve));

const STATISTICS = {
  bySeverity: {
    low: { open: 1, resolved: 0 },
    medium: { open: 2, resolved: 1 },
    high: { open: 0, resolved: 3 },
    critical: { open: 4, resolved: 0 },
  },
  byFacility: [{ id: 'fa-1', name: 'Main site', open: 5, critical: 2 }],
  byEquipmentType: [{ type: 'extinguisher', open: 3 }],
  resolution: { averageDays: 4.5, medianDays: 3 },
  slaBreachedOpen: 2,
} as unknown as NonConformityStatisticsOutput;

describe('NonConformityStatisticsStore', () => {
  let store: InstanceType<typeof NonConformityStatisticsStore>;
  let service: { getNonConformityStatistics: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    service = { getNonConformityStatistics: vi.fn().mockReturnValue(of(STATISTICS)) };

    TestBed.configureTestingModule({
      providers: [NonConformityStatisticsStore, { provide: InspectionService, useValue: service }],
    });

    store = TestBed.inject(NonConformityStatisticsStore);
  });

  it('should be idle before any load', () => {
    expect(store.isQueryLoading()).toBe(false);
    expect(store.queryData()).toBeNull();
  });

  it('should load the snapshot for the given organization without a window', async () => {
    store.load({ organizationId: 'org-1' });
    await flush();

    expect(service.getNonConformityStatistics).toHaveBeenCalledWith('org-1', undefined);
    expect(store.queryData()).toEqual(STATISTICS);
    expect(store.isQueryLoading()).toBe(false);
  });

  it('should forward the from/to window to the service', async () => {
    const window = { from: '2026-03-01T00:00:00Z', to: '2026-03-31T23:59:59Z' };

    store.load({ organizationId: 'org-1', window });
    await flush();

    expect(service.getNonConformityStatistics).toHaveBeenCalledWith('org-1', window);
  });

  it('should short-circuit without a request', async () => {
    store.load(undefined);
    await flush();

    expect(service.getNonConformityStatistics).not.toHaveBeenCalled();
    expect(store.queryData()).toBeNull();
  });

  it('should surface a normalized error when the fetch fails', async () => {
    service.getNonConformityStatistics.mockReturnValueOnce(throwError(() => new Error('boom')));

    store.load({ organizationId: 'org-1' });
    await flush();

    expect(store.isQueryLoading()).toBe(false);
    expect(store.queryHasError()).toBe(true);
    expect(store.queryError()).not.toBeNull();
  });
});
