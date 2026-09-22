import { TestBed } from '@angular/core/testing';
import type { InterventionTimeDraft } from '@features/organization/features/interventions/models';
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
      ['timeJournals', 'task-1', journal],
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
