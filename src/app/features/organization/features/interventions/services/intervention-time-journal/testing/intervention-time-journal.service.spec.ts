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
    versions: vi.fn(),
    getEntry: vi.fn(),
    createEntry: vi.fn(),
    correctEntry: vi.fn(),
    cancelEntry: vi.fn(),
  };
  const cache = {
    readJournalPage: vi.fn(),
    readDraft: vi.fn(),
    saveJournal: vi.fn(),
    clearDraft: vi.fn(),
  };
  const offline = { publicationOwner: () => owner, queue: vi.fn(), listOutbox: vi.fn() };
  beforeEach(() => {
    owner = 'account';
    offlineMode = false;
    api.journal.mockReturnValue(
      of({ entries: [], page: 1, itemsPerPage: 30, totalItems: 0, nextPage: null }),
    );
    api.createEntry.mockReturnValue(of({}));
    api.correctEntry.mockReturnValue(of({}));
    api.cancelEntry.mockReturnValue(of(undefined));
    cache.readJournalPage.mockResolvedValue(null);
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
  it('reads and caches one bounded requested page without starting history requests', async () => {
    api.journal.mockReturnValueOnce(
      of({ entries: [], page: 2, itemsPerPage: 30, totalItems: 75, nextPage: 3 }),
    );
    expect(await firstValueFrom(service.read(scope, 2))).toMatchObject({
      page: 2,
      itemsPerPage: 30,
      totalItems: 75,
      nextPage: 3,
      offline: false,
    });
    expect(api.journal).toHaveBeenCalledExactlyOnceWith('task', 2);
    expect(api.versions).not.toHaveBeenCalled();
    expect(cache.saveJournal).toHaveBeenCalledWith(
      {
        interventionId: 'intervention',
        workItemId: 'task',
        entries: [],
        audience: 'member:member',
        pagination: { page: 2, itemsPerPage: 30, totalItems: 75, nextPage: 3 },
      },
      'account',
    );
  });
  it('uses only an exact cached offline page and preserves unknown total on a missing page', async () => {
    offlineMode = true;
    cache.readJournalPage.mockResolvedValueOnce({
      entries: [],
      page: 2,
      itemsPerPage: 30,
      totalItems: 31,
      nextPage: null,
    });
    expect(await firstValueFrom(service.read(scope, 2))).toMatchObject({
      page: 2,
      totalItems: 31,
      offline: true,
      historyUnavailable: false,
    });
    expect(cache.readJournalPage).toHaveBeenLastCalledWith(scope, 2);
    expect(await firstValueFrom(service.read(scope, 3))).toMatchObject({
      page: 3,
      totalItems: null,
      offline: true,
      historyUnavailable: true,
    });
  });
  it('projects new local entries only on page one while preserving exact saved totals', async () => {
    offline.listOutbox.mockResolvedValue([
      {
        id: 'operation',
        interventionId: 'intervention',
        type: 'time-entry.create',
        payload: { ...input, actorId: 'member', workItemId: 'task' },
        createdAt: '2026-09-16T12:00:00Z',
      },
    ]);
    api.journal
      .mockReturnValueOnce(
        of({ entries: [], page: 1, itemsPerPage: 30, totalItems: 31, nextPage: 2 }),
      )
      .mockReturnValueOnce(
        of({ entries: [], page: 2, itemsPerPage: 30, totalItems: 31, nextPage: null }),
      );
    const first = await firstValueFrom(service.read(scope));
    expect(first.entries.map((entry) => entry.id)).toEqual(['stable-id']);
    expect(first.totalItems).toBe(31);
    const second = await firstValueFrom(service.read(scope, 2));
    expect(second.entries).toEqual([]);
    expect(second.totalItems).toBe(31);
  });
  it('keeps historical revisions explicitly unavailable offline and never substitutes device data', async () => {
    offlineMode = true;
    await expect(firstValueFrom(service.readVersions(scope, 'entry'))).rejects.toThrow(
      'unavailable offline',
    );
    expect(api.versions).not.toHaveBeenCalled();
    expect(cache.readJournalPage).not.toHaveBeenCalled();
    offlineMode = false;
    api.versions.mockReturnValueOnce(throwError(() => ({ status: 0 })));
    await expect(firstValueFrom(service.readVersions(scope, 'entry', 3))).rejects.toMatchObject({
      status: 0,
    });
    expect(api.versions).toHaveBeenLastCalledWith('task', 'entry', 3);
    expect(cache.readJournalPage).not.toHaveBeenCalled();
  });
  it('does not project another beneficiary queued entry into a restricted journal', async () => {
    offline.listOutbox.mockResolvedValue([
      {
        id: 'operation',
        interventionId: 'intervention',
        type: 'time-entry.create',
        payload: { ...input, memberId: 'other-member', actorId: 'member', workItemId: 'task' },
        createdAt: '2026-09-16T12:00:00Z',
      },
    ]);
    expect((await firstValueFrom(service.read({ ...scope, manageOthers: false }))).entries).toEqual(
      [],
    );
    expect(
      (await firstValueFrom(service.read({ ...scope, manageOthers: true }))).entries.map(
        (entry) => entry.memberId,
      ),
    ).toEqual(['other-member']);
  });
  it('reads an off-page saved correction target directly without scanning journal or revision pages', async () => {
    api.getEntry.mockReturnValueOnce(of({ id: 'entry', entry: {} }));
    await firstValueFrom(service.readEntry(scope, 'entry'));
    expect(api.getEntry).toHaveBeenCalledExactlyOnceWith('task', 'entry');
    expect(api.journal).not.toHaveBeenCalled();
    expect(api.versions).not.toHaveBeenCalled();
  });
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
