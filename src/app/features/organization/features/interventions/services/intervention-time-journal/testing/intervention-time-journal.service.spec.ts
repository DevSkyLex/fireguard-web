import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of, throwError } from 'rxjs';
import { ConnectivityService } from '@core/connectivity';
import {
  InterventionTimeRepository,
  InterventionOfflineService,
  InterventionTimeService,
} from '@features/organization/features/interventions/data-access';
import { InterventionTimeJournalService } from '../intervention-time-journal.service';
describe('InterventionTimeJournalService', () => {
  const scope = { workItemId: 'task', interventionId: 'intervention', actorId: 'member' };
  const input = {
    id: 'stable-id',
    memberId: 'member',
    workedOn: '2026-09-16',
    minutes: 120,
    note: null,
  };
  let owner: string;
  let offlineMode: boolean;
  let service: InterventionTimeJournalService;
  const api = {
    journal: vi.fn(),
    createEntry: vi.fn(),
    correctEntry: vi.fn(),
    cancelEntry: vi.fn(),
  };
  const cache = {
    readJournal: vi.fn(),
    readDraft: vi.fn(),
    saveJournal: vi.fn(),
    clearDraft: vi.fn(),
  };
  const offline = { publicationOwner: () => owner, queue: vi.fn(), listOutbox: vi.fn() };
  beforeEach(() => {
    owner = 'account';
    offlineMode = false;
    api.journal.mockReturnValue(of({ entries: [] }));
    api.createEntry.mockReturnValue(of({}));
    api.correctEntry.mockReturnValue(of({}));
    api.cancelEntry.mockReturnValue(of(undefined));
    cache.readJournal.mockResolvedValue(null);
    cache.readDraft.mockResolvedValue(null);
    cache.saveJournal.mockResolvedValue(undefined);
    cache.clearDraft.mockResolvedValue(undefined);
    offline.queue.mockResolvedValue(undefined);
    offline.listOutbox.mockResolvedValue([]);
    TestBed.configureTestingModule({
      providers: [
        InterventionTimeJournalService,
        { provide: InterventionTimeService, useValue: api },
        { provide: InterventionTimeRepository, useValue: cache },
        { provide: InterventionOfflineService, useValue: offline },
        {
          provide: ConnectivityService,
          useValue: {
            isOffline: () => offlineMode,
            isNetworkFailure: (error: unknown) =>
              error !== null &&
              typeof error === 'object' &&
              'status' in error &&
              error.status === 0,
          },
        },
      ],
    });
    service = TestBed.inject(InterventionTimeJournalService);
  });
  afterEach(() => vi.clearAllMocks());
  it('queues a network-failed create with the same client ID', async () => {
    api.createEntry.mockReturnValueOnce(throwError(() => ({ status: 0 })));
    expect(await firstValueFrom(service.write(scope, { kind: 'create', input }, owner))).toBe(
      'queued',
    );
    expect(offline.queue).toHaveBeenCalledWith(
      'intervention',
      'time-entry.create',
      expect.objectContaining({ id: 'stable-id', clientId: 'stable-id', minutes: 120 }),
    );
    expect(cache.clearDraft).toHaveBeenCalledWith('task', 'account');
  });
  it('never turns permission or revision failures into queued writes', async () => {
    api.correctEntry.mockReturnValueOnce(throwError(() => ({ status: 412 })));
    await expect(
      firstValueFrom(service.write(scope, { kind: 'correct', input, revision: 1 }, owner)),
    ).rejects.toMatchObject({ status: 412 });
    expect(offline.queue).not.toHaveBeenCalled();
    expect(cache.clearDraft).not.toHaveBeenCalled();
  });
  it('distinguishes missing offline history from an empty journal', async () => {
    offlineMode = true;
    expect(await firstValueFrom(service.read(scope))).toMatchObject({
      offline: true,
      historyUnavailable: true,
      entries: [],
    });
    expect(api.journal).toHaveBeenCalledTimes(1);
  });
  it('does not erase an unrelated draft when cancelling a saved entry', async () => {
    expect(
      await firstValueFrom(
        service.write(scope, { kind: 'cancel', id: 'entry', revision: 2 }, owner),
      ),
    ).toBe('remote');
    expect(cache.clearDraft).not.toHaveBeenCalled();
  });
  it('rejects late submissions from another account', async () => {
    await expect(
      firstValueFrom(service.write(scope, { kind: 'create', input }, 'old-account')),
    ).rejects.toThrow('account changed');
    expect(api.createEntry).not.toHaveBeenCalled();
    expect(offline.queue).not.toHaveBeenCalled();
  });
  it('keeps journal correction revisions unchanged when another operation is pending', async () => {
    offline.listOutbox.mockResolvedValue([
      { type: 'work-item.update', payload: { workItemId: 'task' } },
    ]);
    expect(
      await firstValueFrom(service.write(scope, { kind: 'correct', input, revision: 3 }, owner)),
    ).toBe('queued');
    expect(offline.queue).toHaveBeenCalledWith(
      'intervention',
      'time-entry.correct',
      expect.objectContaining({ revision: 3 }),
    );
    expect(api.correctEntry).not.toHaveBeenCalled();
  });
});
