import { TestBed } from '@angular/core/testing';
import { InterventionOfflineService } from '@features/organization/features/interventions/data-access';
import type { InterventionOutboxOperation } from '@features/organization/features/interventions/models';
import { InterventionSyncCoordinatorService } from '@features/organization/features/interventions/services';
import { InterventionOperationsStore } from '../intervention-operations.store';
const operation: InterventionOutboxOperation = {
  id: 'op1',
  interventionId: 'i1',
  type: 'comment.create',
  payload: { body: 'Local proof' },
  status: 'conflict',
  createdAt: '2026-09-01T10:00:00Z',
};
const flush = (): Promise<void> =>
  Array.from({ length: 20 }).reduce<Promise<void>>(
    (pending) => pending.then(() => undefined),
    Promise.resolve(),
  );
describe('InterventionOperationsStore', () => {
  let store: InstanceType<typeof InterventionOperationsStore>;
  let offline: {
    publicationOwner: ReturnType<typeof vi.fn>;
    listOutbox: ReturnType<typeof vi.fn>;
    retryOutbox: ReturnType<typeof vi.fn>;
    removeOutbox: ReturnType<typeof vi.fn>;
  };
  let sync: { syncIntervention: ReturnType<typeof vi.fn>; refreshStatus: ReturnType<typeof vi.fn> };
  beforeEach(() => {
    offline = {
      publicationOwner: vi.fn().mockReturnValue('owner1'),
      listOutbox: vi.fn().mockResolvedValue([operation]),
      retryOutbox: vi.fn().mockResolvedValue(undefined),
      removeOutbox: vi.fn().mockResolvedValue(undefined),
    };
    sync = {
      syncIntervention: vi.fn().mockResolvedValue(undefined),
      refreshStatus: vi.fn().mockResolvedValue(undefined),
    };
    TestBed.configureTestingModule({
      providers: [
        InterventionOperationsStore,
        { provide: InterventionOfflineService, useValue: offline },
        { provide: InterventionSyncCoordinatorService, useValue: sync },
      ],
    });
    store = TestBed.inject(InterventionOperationsStore);
  });
  it('does not equate a local read failure with an empty queue', async () => {
    offline.listOutbox.mockRejectedValue(new Error('storage'));
    store.load({ organizationId: 'o1', interventionId: 'i1' });
    await flush();
    expect(store.loadCallState().status).toBe('error');
  });
  it('retries exactly one approved operation within the active intervention', async () => {
    store.load({ organizationId: 'o1', interventionId: 'i1' });
    await flush();
    store.resolve({ id: 'foreign', action: 'retry' });
    expect(offline.retryOutbox).not.toHaveBeenCalled();
    store.resolve({ id: 'op1', action: 'retry' });
    await flush();
    expect(offline.retryOutbox).toHaveBeenCalledExactlyOnceWith('op1');
    expect(sync.syncIntervention).toHaveBeenCalledExactlyOnceWith('o1', 'i1');
    expect(offline.removeOutbox).not.toHaveBeenCalled();
  });
  it('keeps a failed retry visible and permits another attempt', async () => {
    store.load({ organizationId: 'o1', interventionId: 'i1' });
    await flush();
    sync.syncIntervention.mockRejectedValueOnce(new Error('network'));
    store.resolve({ id: 'op1', action: 'retry' });
    await flush();
    expect(store.mutations()['op1'].status).toBe('error');
    expect(store.operations()).toEqual([operation]);
    store.resolve({ id: 'op1', action: 'retry' });
    await flush();
    expect(store.mutations()['op1'].status).toBe('success');
  });
  it('ignores a response after the account changes', async () => {
    let resolve!: (value: InterventionOutboxOperation[]) => void;
    offline.listOutbox.mockReturnValue(
      new Promise<InterventionOutboxOperation[]>((done) => (resolve = done)),
    );
    store.load({ organizationId: 'o1', interventionId: 'i1' });
    offline.publicationOwner.mockReturnValue('owner2');
    resolve([operation]);
    await flush();
    expect(store.operations()).toEqual([]);
  });
});
