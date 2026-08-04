import { PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import type { HydraCollection } from '@core/api/models';
import { InterventionService } from '@features/organization/features/interventions';
import { InterventionOfflineService } from '@features/organization/features/interventions/data-access';
import type {
  InterventionListOptions,
  InterventionOutput,
} from '@features/organization/features/interventions/models';
import { ActiveOrganizationStore } from '@features/organization/state';
import { OrganizationTodayStore } from '../organization-today.store';

/** Chains `turns` sequential microtask hops without an `await` inside a loop. */
function drainMicrotasks(turns: number): Promise<void> {
  return turns <= 0 ? Promise.resolve() : Promise.resolve().then(() => drainMicrotasks(turns - 1));
}

// `loadUnsynced` chains several sequential `await`s over the offline service
// (ids -> cached interventions -> per-intervention outbox counts) before the
// resulting promise reaches `from(...)`, so draining just one or two
// microtasks leaves it unsettled — unlike the collection-backed `load`, whose
// mocked `of(...)` responses resolve in a single turn.
const flushEffects = async (): Promise<void> => {
  TestBed.tick();
  await drainMicrotasks(10);
};

/** Which of the five parallel requests a `list()` call answers. */
type QueueBranch =
  | 'overduePlanned'
  | 'overdueInProgress'
  | 'awaitingReview'
  | 'changesRequested'
  | 'upcoming';

function branchOf(options: InterventionListOptions | undefined): QueueBranch {
  if (options?.status === 'planned' && options.dueAtBefore) return 'overduePlanned';
  if (options?.status === 'in_progress') return 'overdueInProgress';
  if (options?.status === 'submitted') return 'awaitingReview';
  if (options?.status === 'changes_requested') return 'changesRequested';
  if (options?.status === 'planned' && options.dueAtAfter) return 'upcoming';
  throw new Error(`Unexpected intervention list() options: ${JSON.stringify(options)}`);
}

function item(id: string): InterventionOutput {
  return { id } as unknown as InterventionOutput;
}

function collection(
  member: readonly InterventionOutput[],
  totalItems: number,
): HydraCollection<InterventionOutput> {
  return {
    '@id': '/api/interventions',
    '@type': 'Collection',
    member,
    totalItems,
  } as HydraCollection<InterventionOutput>;
}

const EMPTY_COLLECTION: HydraCollection<InterventionOutput> = collection([], 0);

describe('OrganizationTodayStore', () => {
  let store: OrganizationTodayStore;
  let interventionService: { list: ReturnType<typeof vi.fn> };
  let offline: {
    listInterventionIdsWithOutbox: ReturnType<typeof vi.fn>;
    listInterventions: ReturnType<typeof vi.fn>;
    listOutbox: ReturnType<typeof vi.fn>;
  };

  /** Wires `list()` to answer only the named branches; every other branch is empty. */
  function configureQueues(
    responses: Partial<Record<QueueBranch, HydraCollection<InterventionOutput>>>,
  ): void {
    interventionService.list.mockImplementation(
      (_organizationId: string, options?: InterventionListOptions) =>
        of(responses[branchOf(options)] ?? EMPTY_COLLECTION),
    );
  }

  beforeEach(() => {
    interventionService = { list: vi.fn() };
    offline = {
      listInterventionIdsWithOutbox: vi.fn().mockResolvedValue([]),
      listInterventions: vi.fn().mockResolvedValue([]),
      listOutbox: vi.fn().mockResolvedValue([]),
    };
    configureQueues({});

    TestBed.configureTestingModule({
      providers: [
        OrganizationTodayStore,
        { provide: InterventionService, useValue: interventionService },
        { provide: InterventionOfflineService, useValue: offline },
        {
          provide: ActiveOrganizationStore,
          useValue: { selectedOrganizationId: signal<string | null>('org-1') },
        },
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });

    store = TestBed.inject(OrganizationTodayStore);
  });

  it('should expose every queue as an empty structure before anything resolves', () => {
    expect(store.overdue()).toEqual({ key: 'overdue', total: 0, items: [] });
    expect(store.changesRequested()).toEqual({ key: 'changesRequested', total: 0, items: [] });
    expect(store.awaitingReview()).toEqual({ key: 'awaitingReview', total: 0, items: [] });
    expect(store.upcoming()).toEqual({ key: 'upcoming', total: 0, items: [] });
  });

  it('should sum the two overdue requests and cap the merged items at four', async () => {
    const planned = [item('p-1'), item('p-2'), item('p-3')];
    const inProgress = [item('i-1'), item('i-2'), item('i-3')];
    configureQueues({
      overduePlanned: collection(planned, 5),
      overdueInProgress: collection(inProgress, 2),
    });

    await flushEffects();

    expect(store.overdue()).toEqual({
      key: 'overdue',
      total: 7,
      items: [planned[0], planned[1], planned[2], inProgress[0]],
    });
  });

  it('should record a queues failure without discarding previous data or the independently-loaded unsynced queue', async () => {
    configureQueues({ overduePlanned: collection([item('p-1')], 3) });
    const cached = item('int-1');
    offline.listInterventionIdsWithOutbox.mockResolvedValue(['int-1']);
    offline.listInterventions.mockResolvedValue([cached]);
    offline.listOutbox.mockResolvedValue(['op-a']);

    await flushEffects();
    expect(store.hasError()).toBe(false);
    expect(store.overdue().total).toBe(3);
    expect(store.unsynced()).toEqual([{ intervention: cached, pendingCount: 1 }]);

    // A retry that now fails must not erase what already loaded successfully.
    interventionService.list.mockImplementation(() => throwError(() => new Error('network down')));
    store.load('org-1');
    await flushEffects();

    expect(store.hasError()).toBe(true);
    expect(store.overdue().total).toBe(3);
    // Read from the local outbox, independent of the network CallState.
    expect(store.unsynced()).toEqual([{ intervention: cached, pendingCount: 1 }]);
  });

  it('should not claim all-clear while the queues are still pending', async () => {
    interventionService.list.mockReturnValue(new Subject<HydraCollection<InterventionOutput>>());

    await flushEffects();

    expect(store.isLoading()).toBe(true);
    expect(store.hasError()).toBe(false);
    expect(store.isAllClear()).toBe(false);
  });

  it('should skip an outbox id whose intervention was never cached locally, and count pending ops from listOutbox', async () => {
    const cached = item('int-1');
    offline.listInterventionIdsWithOutbox.mockResolvedValue(['int-1', 'int-2']);
    offline.listInterventions.mockResolvedValue([cached]);
    offline.listOutbox.mockImplementation((interventionId: string) =>
      Promise.resolve(interventionId === 'int-1' ? ['op-a', 'op-b', 'op-c'] : ['unexpected']),
    );

    await flushEffects();

    expect(store.unsynced()).toEqual([{ intervention: cached, pendingCount: 3 }]);
    expect(offline.listOutbox).not.toHaveBeenCalledWith('int-2');
  });

  it('should sum overdue, changesRequested, awaitingReview and the unsynced count into waitingCount, but never upcoming', async () => {
    configureQueues({
      overduePlanned: collection([], 2),
      changesRequested: collection([], 1),
      awaitingReview: collection([], 4),
      upcoming: collection([item('u-1')], 99),
    });
    offline.listInterventionIdsWithOutbox.mockResolvedValue(['int-1']);
    offline.listInterventions.mockResolvedValue([item('int-1')]);
    offline.listOutbox.mockResolvedValue(['op-a', 'op-b']);

    await flushEffects();

    expect(store.waitingCount()).toBe(2 + 1 + 4 + 1);
  });

  it('should claim all-clear only once every queue and the unsynced queue resolved to zero', async () => {
    await flushEffects();

    expect(store.hasError()).toBe(false);
    expect(store.waitingCount()).toBe(0);
    expect(store.isAllClear()).toBe(true);
  });
});
