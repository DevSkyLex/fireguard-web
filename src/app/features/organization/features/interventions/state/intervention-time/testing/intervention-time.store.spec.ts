import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import {
  InterventionOfflineService,
  InterventionTimeRepository,
} from '@features/organization/features/interventions/data-access';
import type { InterventionTimeJournalView } from '@features/organization/features/interventions/models';
import { InterventionTimeJournalService } from '@features/organization/features/interventions/services/intervention-time-journal';
import { InterventionTimeStore, type InterventionTimeStoreType } from '../intervention-time.store';
describe('InterventionTimeStore', () => {
  const scope = { interventionId: 'intervention', workItemId: 'task', actorId: 'member' };
  const draft = {
    id: 'stable',
    memberId: 'member',
    workedOn: '2026-09-16',
    minutes: '120',
    note: '',
    baseRevision: null,
  };
  const view: InterventionTimeJournalView = {
    entries: [],
    draft: null,
    offline: false,
    historyUnavailable: false,
  };
  let store: InterventionTimeStoreType;
  let owner: string;
  const journal = { read: vi.fn(), write: vi.fn() };
  const repository = { saveDraft: vi.fn(), clearDraft: vi.fn() };
  beforeEach(() => {
    owner = 'account';
    journal.read.mockReturnValue(of(view));
    journal.write.mockReturnValue(of('remote'));
    repository.saveDraft.mockResolvedValue(undefined);
    repository.clearDraft.mockResolvedValue(undefined);
    TestBed.configureTestingModule({
      providers: [
        InterventionTimeStore,
        { provide: InterventionTimeJournalService, useValue: journal },
        { provide: InterventionTimeRepository, useValue: repository },
        { provide: InterventionOfflineService, useValue: { publicationOwner: () => owner } },
      ],
    });
    store = TestBed.inject(InterventionTimeStore);
  });
  afterEach(() => vi.clearAllMocks());
  it('cancels obsolete journal reads', () => {
    const pending = new Subject<InterventionTimeJournalView>();
    journal.read.mockReturnValueOnce(pending);
    store.load(scope);
    store.load({ ...scope, workItemId: 'next' });
    expect(pending.observed).toBe(false);
    expect(store.scope()?.workItemId).toBe('next');
  });
  it('serializes the last draft persistence before submission', async () => {
    let release = vi.fn<() => void>();
    repository.saveDraft.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        release = vi.fn(resolve);
      }),
    );
    store.load(scope);
    store.saveDraft({ scope, draft });
    store.write({
      scope,
      command: {
        kind: 'create',
        input: {
          id: 'stable',
          memberId: 'member',
          workedOn: draft.workedOn,
          minutes: 120,
          note: null,
        },
      },
    });
    expect(store.writeCallState().status).toBe('pending');
    expect(journal.write).not.toHaveBeenCalled();
    release();
    await vi.waitFor(() => expect(journal.write).toHaveBeenCalledTimes(1));
    expect(store.writeCallState().status).toBe('success');
  });
  it('does not execute a waiting write under another account', async () => {
    let release = vi.fn<() => void>();
    repository.saveDraft.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        release = vi.fn(resolve);
      }),
    );
    store.load(scope);
    store.saveDraft({ scope, draft });
    store.write({ scope, command: { kind: 'cancel', id: 'entry', revision: 1 } });
    owner = 'other';
    store.load(null);
    release();
    await Promise.resolve();
    await Promise.resolve();
    expect(journal.write).not.toHaveBeenCalled();
    expect(store.scope()).toBeNull();
  });
  it('serializes explicit draft discard after previous draft saves', async () => {
    store.load(scope);
    store.saveDraft({ scope, draft });
    store.saveDraft({ scope, draft: null });
    await vi.waitFor(() => expect(repository.clearDraft).toHaveBeenCalledWith('task', 'account'));
    expect(store.draft()).toBeNull();
  });
  it('retains failed input in memory across refresh and supports explicit retry', async () => {
    repository.saveDraft.mockRejectedValueOnce(new Error('Storage quota exceeded'));
    store.load(scope);
    store.saveDraft({ scope, draft });
    await vi.waitFor(() => expect(store.draftCallState().status).toBe('error'));
    store.load(scope);
    expect(store.draft()).toEqual(draft);
    store.saveDraft({ scope, draft });
    await vi.waitFor(() => expect(store.draftCallState().status).toBe('success'));
    expect(store.draft()).toEqual(draft);
  });
  it('never replaces the latest unsaved input with an older persistence completion', async () => {
    let release = vi.fn<() => void>();
    repository.saveDraft.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        release = vi.fn(resolve);
      }),
    );
    const later = { ...draft, note: 'Latest field notes' };
    store.load(scope);
    store.saveDraft({ scope, draft });
    store.saveDraft({ scope, draft: later });
    expect(store.draft()).toEqual(later);
    release();
    await vi.waitFor(() => expect(store.draftCallState().status).toBe('success'));
    expect(store.draft()).toEqual(later);
  });
});
