import { TestBed } from '@angular/core/testing';
import type {
  InterventionTimeDraft,
  InterventionTimeEntry,
} from '@features/organization/features/interventions/models';
import { InterventionDatabaseService } from '../intervention-database.service';
import { InterventionTimeRepository } from '../intervention-time.repository';
import type {
  InterventionTimeDraftRecord,
  InterventionTimeRecord,
} from '../models/intervention-time-record.interface';

describe('InterventionTimeRepository', () => {
  let repository: InterventionTimeRepository;
  let owner: string | null;
  const database = {
    currentOwnerId: vi.fn(),
    ensureOwnerBound: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    remove: vi.fn(),
  };
  const draft: InterventionTimeDraft = {
    id: 'entry-1',
    memberId: 'member-1',
    workedOn: '2026-09-21',
    minutes: '90',
    note: 'Preserve my input',
    baseRevision: 4,
  };
  const journal: InterventionTimeRecord = {
    interventionId: 'intervention-1',
    workItemId: 'task-1',
    entries: [],
  };
  const draftRecord: InterventionTimeDraftRecord = {
    interventionId: 'intervention-1',
    workItemId: 'task-1',
    draft,
  };
  const scope = { interventionId: 'intervention-1', workItemId: 'task-1', actorId: 'member-1' };
  const row: InterventionTimeEntry = {
    id: 'entry-1',
    workItemId: 'task-1',
    memberId: 'member-1',
    workedOn: '2026-09-21',
    minutes: 60,
    revision: 1,
    cancelled: false,
    createdBy: 'member-1',
    updatedBy: 'member-1',
    createdAt: '2026-09-21T10:00:00Z',
    updatedAt: '2026-09-21T10:00:00Z',
    versions: [],
    totalVersions: 1,
    nextBeforeRevision: null,
  };
  const pageRecord: InterventionTimeRecord = {
    ...journal,
    audience: 'member:member-1',
    entries: [row],
    pagination: { page: 2, itemsPerPage: 30, totalItems: 75, nextPage: 3 },
  };

  beforeEach(() => {
    vi.resetAllMocks();
    owner = 'account-1';
    database.currentOwnerId.mockImplementation(() => owner);
    database.ensureOwnerBound.mockResolvedValue(undefined);
    database.put.mockResolvedValue(undefined);
    database.remove.mockResolvedValue(undefined);
    TestBed.configureTestingModule({
      providers: [
        InterventionTimeRepository,
        { provide: InterventionDatabaseService, useValue: database },
      ],
    });
    repository = TestBed.inject(InterventionTimeRepository);
  });
  it('stores page metadata under a separate audience-bound key without overwriting the complete journal', async () => {
    await repository.saveJournal(pageRecord, 'account-1');
    expect(database.put).toHaveBeenCalledExactlyOnceWith(
      'timeJournals',
      'page:v2:task-1:member:member-1:30:2',
      pageRecord,
      expect.any(Function),
    );
    const current = database.put.mock.calls[0][3] as () => boolean;
    expect(current()).toBe(true);
    owner = 'other-account';
    expect(current()).toBe(false);
  });
  it('returns only the requested cached page with exact count and continuation', async () => {
    database.get.mockResolvedValueOnce(pageRecord);
    await expect(repository.readJournalPage(scope, 2)).resolves.toEqual({
      entries: [row],
      page: 2,
      itemsPerPage: 30,
      totalItems: 75,
      nextPage: 3,
    });
    expect(database.get).toHaveBeenCalledExactlyOnceWith(
      'timeJournals',
      'page:v2:task-1:member:member-1:30:2',
    );
  });
  it('does not expose a formerly broad manager page under beneficiary-only authority', async () => {
    database.get
      .mockResolvedValueOnce({ ...pageRecord, audience: 'all' })
      .mockResolvedValueOnce(null);
    await expect(repository.readJournalPage(scope, 2)).resolves.toBeNull();
    expect(database.get.mock.calls[0]).toEqual([
      'timeJournals',
      'page:v2:task-1:member:member-1:30:2',
    ]);
  });
  it('ignores polluted older page labels without changing stored histories or pending work', async () => {
    const oldPage = { ...pageRecord, entries: [row, { ...row, id: 'foreign', memberId: 'other' }] };
    const records = new Map([['page:task-1:member:member-1:30:2', oldPage]]);
    database.get.mockImplementation(
      async (_store: string, key: string) => records.get(key) ?? null,
    );
    await expect(repository.readJournalPage(scope, 2)).resolves.toBeNull();
    expect(database.get.mock.calls).toEqual([
      ['timeJournals', 'page:v2:task-1:member:member-1:30:2'],
      ['timeJournals', 'task-1'],
    ]);
    expect(records.get('page:task-1:member:member-1:30:2')).toBe(oldPage);
    expect(oldPage.entries).toHaveLength(2);
    expect(database.put).not.toHaveBeenCalled();
    expect(database.remove).not.toHaveBeenCalled();
  });
  it('rejects a whole restricted page containing foreign entries rather than filtering its totals', async () => {
    const polluted = {
      ...pageRecord,
      entries: [row, { ...row, id: 'foreign', memberId: 'other' }],
    };
    await expect(repository.saveJournal(polluted, 'account-1')).rejects.toThrow(
      'authorized audience',
    );
    expect(database.put).not.toHaveBeenCalled();
    database.get.mockResolvedValueOnce(polluted);
    await expect(repository.readJournalPage(scope, 2)).resolves.toBeNull();
    expect(database.get).toHaveBeenCalledOnce();
    expect(polluted.entries).toHaveLength(2);
    expect(polluted.pagination?.totalItems).toBe(75);
  });
  it('filters complete legacy history before repaging and keeps stored revisions intact', async () => {
    const own = Array.from({ length: 31 }, (_, index) => ({ ...row, id: `own-${index}` }));
    const foreign = Array.from({ length: 35 }, (_, index) => ({
      ...row,
      id: `foreign-${index}`,
      memberId: 'other',
    }));
    const complete = { ...journal, entries: [...foreign, ...own] };
    database.get.mockResolvedValueOnce(null).mockResolvedValueOnce(complete);
    const second = await repository.readJournalPage(scope, 2);
    expect(second).toMatchObject({ page: 2, totalItems: 31, nextPage: null });
    expect(second?.entries).toHaveLength(1);
    expect(second?.entries.every((entry) => entry.memberId === scope.actorId)).toBe(true);
    expect(complete.entries).toHaveLength(66);
    expect(database.put).not.toHaveBeenCalled();
    expect(database.remove).not.toHaveBeenCalled();
  });
  it('filters and slices compatible legacy snapshots while refusing unproven broad completeness', async () => {
    const legacy = { ...journal, entries: [row, { ...row, id: 'entry-other', memberId: 'other' }] };
    database.get.mockResolvedValueOnce(null).mockResolvedValueOnce(legacy);
    await expect(repository.readJournalPage(scope, 1)).resolves.toEqual({
      entries: [row],
      page: 1,
      itemsPerPage: 30,
      totalItems: 1,
      nextPage: null,
    });
    database.get.mockResolvedValueOnce(null);
    await expect(
      repository.readJournalPage({ ...scope, manageOthers: true }, 1),
    ).resolves.toBeNull();
  });
  it('keeps missing offline pages unknown and excludes late page reads from another account', async () => {
    database.get.mockResolvedValue(null);
    await expect(repository.readJournalPage(scope, 2)).resolves.toBeNull();
    database.get.mockImplementationOnce(async () => {
      owner = 'account-2';
      return pageRecord;
    });
    await expect(repository.readJournalPage(scope, 2)).resolves.toBeNull();
  });
  it('bounds legacy embedded revision history without mutating the durable complete snapshot', async () => {
    const versions = [1, 2, 3].map((revision) => ({
      revision,
      workedOn: row.workedOn,
      minutes: row.minutes,
      note: null,
      cancelled: false,
      actorId: row.memberId,
      recordedAt: row.updatedAt,
    }));
    const historical = { ...row, revision: 3, totalVersions: 3, nextBeforeRevision: 3, versions };
    database.get
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ ...journal, entries: [historical] });
    const page = await repository.readJournalPage(scope);
    expect(page?.entries[0]).not.toBe(historical);
    expect(page?.entries[0].versions).toEqual([versions[2]]);
    expect(page?.entries[0].versions).not.toBe(versions);
    expect(page?.entries[0].totalVersions).toBe(3);
    expect(page?.entries[0].nextBeforeRevision).toBe(3);
    expect(historical.versions).toHaveLength(3);
  });

  it('distinguishes a cached empty journal from unavailable history', async () => {
    database.get.mockResolvedValueOnce(journal).mockResolvedValueOnce(null);
    await expect(repository.readJournal('intervention-1', 'task-1')).resolves.toEqual([]);
    await expect(repository.readJournal('intervention-1', 'task-1')).resolves.toBeNull();
    expect(database.get).toHaveBeenLastCalledWith('timeJournals', 'task-1');
    expect(database.ensureOwnerBound).toHaveBeenCalledTimes(2);
  });

  it('reads drafts independently from the journal and preserves their stable id and revision', async () => {
    database.get.mockResolvedValue(draftRecord);
    await expect(repository.readDraft('intervention-1', 'task-1')).resolves.toEqual(draft);
    expect(database.get).toHaveBeenCalledExactlyOnceWith('timeDrafts', 'task-1');
    expect(database.put).not.toHaveBeenCalled();
  });

  it('does not expose drafts or journals without an authenticated local owner', async () => {
    owner = null;
    await expect(repository.readJournal('intervention-1', 'task-1')).resolves.toBeNull();
    await expect(repository.readDraft('intervention-1', 'task-1')).resolves.toBeNull();
    expect(database.ensureOwnerBound).not.toHaveBeenCalled();
    expect(database.get).not.toHaveBeenCalled();
  });

  it('rejects records from a different intervention even when a task id matches', async () => {
    database.get.mockResolvedValueOnce(journal).mockResolvedValueOnce(draftRecord);
    await expect(repository.readJournal('intervention-2', 'task-1')).resolves.toBeNull();
    await expect(repository.readDraft('intervention-2', 'task-1')).resolves.toBeNull();
  });

  it.each(['journal', 'draft'] as const)(
    'discards a late %s read after the active account changes',
    async (kind) => {
      database.get.mockImplementation(async () => {
        owner = 'account-2';
        return kind === 'journal' ? journal : draftRecord;
      });
      const value =
        kind === 'journal'
          ? repository.readJournal('intervention-1', 'task-1')
          : repository.readDraft('intervention-1', 'task-1');
      await expect(value).resolves.toBeNull();
    },
  );

  it('stores journals and drafts in separate account-bound stores and removes only the requested draft', async () => {
    await repository.saveJournal(journal, 'account-1');
    await repository.saveDraft(draftRecord, 'account-1');
    await repository.clearDraft('task-1', 'account-1');
    expect(database.put.mock.calls).toEqual([
      ['timeJournals', 'task-1', journal, expect.any(Function)],
      ['timeDrafts', 'task-1', draftRecord],
    ]);
    expect(database.remove).toHaveBeenCalledExactlyOnceWith('timeDrafts', 'task-1');
    expect(database.ensureOwnerBound).toHaveBeenCalledTimes(3);
  });

  it.each([null, 'account-other'])(
    'refuses all writes with captured owner %s before binding storage',
    async (captured) => {
      await repository.saveJournal(journal, captured);
      await repository.saveDraft(draftRecord, captured);
      await repository.clearDraft('task-1', captured);
      expect(database.ensureOwnerBound).not.toHaveBeenCalled();
      expect(database.put).not.toHaveBeenCalled();
      expect(database.remove).not.toHaveBeenCalled();
    },
  );

  it.each(['journal', 'draft', 'clear'] as const)(
    'fences a pending %s write when owner binding changes accounts',
    async (kind) => {
      database.ensureOwnerBound.mockImplementation(async () => {
        owner = 'account-2';
      });
      if (kind === 'journal') await repository.saveJournal(journal, 'account-1');
      else if (kind === 'draft') await repository.saveDraft(draftRecord, 'account-1');
      else await repository.clearDraft('task-1', 'account-1');
      expect(database.put).not.toHaveBeenCalled();
      expect(database.remove).not.toHaveBeenCalled();
    },
  );

  it('propagates failed draft persistence so the UI can preserve input and prevent dismissal', async () => {
    const failure = new Error('Quota exceeded');
    database.put.mockRejectedValue(failure);
    await expect(repository.saveDraft(draftRecord, 'account-1')).rejects.toBe(failure);
  });

  it('does not treat a read failure as an empty authorized journal', async () => {
    const failure = new Error('Database unavailable');
    database.get.mockRejectedValue(failure);
    await expect(repository.readJournal('intervention-1', 'task-1')).rejects.toBe(failure);
  });
});
