import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { InterventionService } from '@features/organization/features/interventions/data-access';
import type { InterventionStatisticsOutput } from '@features/organization/features/interventions/models';
import { InterventionStatisticsStore } from '../intervention-statistics.store';

const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve));

const STATISTICS = { total: 12, overdue: 2 } as unknown as InterventionStatisticsOutput;

describe('InterventionStatisticsStore', () => {
  let store: InstanceType<typeof InterventionStatisticsStore>;
  let service: { statistics: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    service = { statistics: vi.fn().mockReturnValue(of(STATISTICS)) };

    TestBed.configureTestingModule({
      providers: [InterventionStatisticsStore, { provide: InterventionService, useValue: service }],
    });

    store = TestBed.inject(InterventionStatisticsStore);
  });

  it('should be idle before any load', () => {
    expect(store.isQueryLoading()).toBe(false);
    expect(store.queryData()).toBeNull();
  });

  it('should load the statistics snapshot for the given organization', async () => {
    store.load('org-1');
    await flush();

    expect(service.statistics).toHaveBeenCalledWith('org-1');
    expect(store.queryData()).toEqual(STATISTICS);
    expect(store.isQueryLoading()).toBe(false);
  });

  it('should short-circuit without an organization id', async () => {
    store.load(undefined);
    await flush();

    expect(service.statistics).not.toHaveBeenCalled();
    expect(store.queryData()).toBeNull();
  });

  it('should surface a normalized error when the fetch fails', async () => {
    service.statistics.mockReturnValueOnce(throwError(() => new Error('boom')));

    store.load('org-1');
    await flush();

    expect(store.isQueryLoading()).toBe(false);
    expect(store.queryError()).not.toBeNull();
  });
});
