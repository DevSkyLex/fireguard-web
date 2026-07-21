import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { InterventionService } from '@features/organization/features/interventions/data-access';
import type { InterventionOutput } from '@features/organization/features/interventions/models';
import { UpcomingInterventionsStore } from '../organization-dashboard-upcoming-interventions.store';

const flushEffects = async (): Promise<void> => {
  TestBed.tick();
  await Promise.resolve();
  await Promise.resolve();
};

describe('UpcomingInterventionsStore', () => {
  let store: InstanceType<typeof UpcomingInterventionsStore>;
  let mockInterventionService: {
    list: ReturnType<typeof vi.fn>;
  };

  const intervention = {
    id: 'int-1',
    number: 2048,
    name: 'Contrôle annuel extincteurs',
    status: 'in_progress',
    priority: 'high',
    dueAt: '2026-08-01T00:00:00+00:00',
  } as unknown as InterventionOutput;

  beforeEach(() => {
    mockInterventionService = {
      list: vi.fn().mockReturnValue(of({ member: [intervention], totalItems: 1 })),
    };

    TestBed.configureTestingModule({
      providers: [
        UpcomingInterventionsStore,
        { provide: InterventionService, useValue: mockInterventionService },
      ],
    });

    store = TestBed.inject(UpcomingInterventionsStore);
  });

  it('should fetch the soonest-due page for the organization', async () => {
    store.load('org-1');
    await flushEffects();

    expect(mockInterventionService.list).toHaveBeenCalledWith(
      'org-1',
      expect.objectContaining({
        itemsPerPage: 5,
        dueAtAfter: expect.any(String),
        order: { dueAt: 'asc' },
      }),
    );
    expect(store.queryData()).toEqual([intervention]);
  });

  it('should not fetch without an organization id', async () => {
    store.load(null);
    await flushEffects();

    expect(mockInterventionService.list).not.toHaveBeenCalled();
    expect(store.queryData()).toBeNull();
  });

  it('should normalize a failed query into the error state', async () => {
    mockInterventionService.list.mockReturnValue(throwError(() => new Error('boom')));

    store.load('org-1');
    await flushEffects();

    expect(store.queryHasError()).toBe(true);
  });
});
