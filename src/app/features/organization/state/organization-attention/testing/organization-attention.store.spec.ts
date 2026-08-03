import { PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import type { HydraCollection } from '@core/api/models';
import { InterventionService } from '@features/organization/features/interventions';
import { ActiveOrganizationStore } from '@features/organization/state';
import { OrganizationAttentionStore } from '../organization-attention.store';

const flushEffects = async (): Promise<void> => {
  TestBed.tick();
  await Promise.resolve();
  await Promise.resolve();
};

const collectionOf = (totalItems: number): HydraCollection<never> =>
  ({ member: [], totalItems }) as unknown as HydraCollection<never>;

describe('OrganizationAttentionStore', () => {
  let store: OrganizationAttentionStore;
  let mockInterventionService: { list: ReturnType<typeof vi.fn> };

  const countsByStatus: Readonly<Record<string, number>> = {
    submitted: 4,
    changes_requested: 2,
    planned: 3,
    in_progress: 5,
  };

  const configure = (): void => {
    TestBed.configureTestingModule({
      providers: [
        OrganizationAttentionStore,
        { provide: InterventionService, useValue: mockInterventionService },
        {
          provide: ActiveOrganizationStore,
          useValue: { selectedOrganizationId: signal<string | null>('org-1') },
        },
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });

    store = TestBed.inject(OrganizationAttentionStore);
  };

  beforeEach(() => {
    mockInterventionService = {
      list: vi
        .fn()
        .mockImplementation((_organizationId: string, options: { status: string }) =>
          of(collectionOf(countsByStatus[options.status] ?? 0)),
        ),
    };
  });

  it('should sum the two overdue status queries into a single count', async () => {
    configure();
    await flushEffects();

    expect(store.awaitingReviewCount()).toBe(4);
    expect(store.changesRequestedCount()).toBe(2);
    expect(store.overdueCount()).toBe(8);
    expect(store.hasAttention()).toBe(true);
  });

  it('should scope each overdue query to a workable status and a past due date', async () => {
    configure();
    await flushEffects();

    expect(mockInterventionService.list).toHaveBeenCalledTimes(4);

    const calls: readonly unknown[][] = mockInterventionService.list.mock.calls;
    const optionsByStatus = new Map<string, Record<string, unknown>>();

    for (const call of calls) {
      const options = call[1] as Record<string, unknown>;
      optionsByStatus.set(String(options['status']), options);
      expect(options['itemsPerPage']).toBe(1);
    }

    expect(optionsByStatus.get('submitted')?.['dueAtBefore']).toBeUndefined();
    expect(optionsByStatus.get('changes_requested')?.['dueAtBefore']).toBeUndefined();
    expect(optionsByStatus.get('planned')?.['dueAtBefore']).toBeDefined();
    expect(optionsByStatus.get('in_progress')?.['dueAtBefore']).toBeDefined();
  });

  it('should report no attention when every count is zero', async () => {
    mockInterventionService.list = vi.fn().mockReturnValue(of(collectionOf(0)));
    configure();
    await flushEffects();

    expect(store.hasAttention()).toBe(false);
    expect(store.overdueCount()).toBe(0);
  });

  it('should surface a failed load as a query error', async () => {
    mockInterventionService.list = vi
      .fn()
      .mockReturnValue(throwError(() => new Error('network down')));
    configure();
    await flushEffects();

    expect(store.queryHasError()).toBe(true);
    expect(store.hasAttention()).toBe(false);
  });
});
