import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import {
  InterventionOfflineService,
  InterventionTimeRepository,
} from '@features/organization/features/interventions/data-access';
import type {
  InterventionTimeJournalView,
  InterventionTimeEntryView,
  InterventionTimeEntryVersionsOutput,
  InterventionTimeEntryVersion,
} from '@features/organization/features/interventions/models';
import { InterventionTimeJournalService } from '@features/organization/features/interventions/services/intervention-time-journal';
import { InterventionTimeStore, type InterventionTimeStoreType } from '../intervention-time.store';

function unload(): Event {
  const event = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(event);
  return event;
}

const version = (revision: number): InterventionTimeEntryVersion => ({
  revision,
  workedOn: '2026-09-16',
  minutes: 120,
  note: null,
  cancelled: false,
  actorId: 'member',
  recordedAt: '2026-09-16T12:00:00Z',
});

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
    page: 1,
    itemsPerPage: 30,
    totalItems: 0,
    nextPage: null,
  };
  const entry: InterventionTimeEntryView = {
    id: 'entry',
    workItemId: 'task',
    memberId: 'member',
    workedOn: '2026-09-16',
    minutes: 120,
    revision: 3,
    cancelled: false,
    createdBy: 'member',
    updatedBy: 'member',
    createdAt: '2026-09-16T12:00:00Z',
    updatedAt: '2026-09-16T12:00:00Z',
    versions: [version(3)],
    totalVersions: 3,
    nextBeforeRevision: 3,
  };
  const history = (
    revisions: readonly number[],
    nextBeforeRevision: number | null,
  ): InterventionTimeEntryVersionsOutput => ({
    '@id': '/time-entries/entry/versions',
    '@type': 'InterventionTimeEntryVersions',
    id: 'entry',
    versions: revisions.map(version),
    totalItems: 3,
    itemsPerPage: 2,
    nextBeforeRevision,
  });
  let store: InterventionTimeStoreType;
  let owner: string;
  const journal = { read: vi.fn(), readVersions: vi.fn(), readEntry: vi.fn(), write: vi.fn() };
  const repository = { saveDraft: vi.fn(), clearDraft: vi.fn() };
  function createStore(platform = 'browser'): void {
    TestBed.configureTestingModule({
      providers: [
        InterventionTimeStore,
        { provide: PLATFORM_ID, useValue: platform },
        { provide: InterventionTimeJournalService, useValue: journal },
        { provide: InterventionTimeRepository, useValue: repository },
        { provide: InterventionOfflineService, useValue: { publicationOwner: () => owner } },
      ],
    });
    store = TestBed.inject(InterventionTimeStore);
  }
  beforeEach(() => {
    owner = 'account';
    journal.read.mockReturnValue(of(view));
    journal.readVersions.mockReturnValue(of(history([3, 2], 2)));
    journal.readEntry.mockReturnValue(of({ id: 'entry', entry }));
    journal.write.mockReturnValue(of('remote'));
    repository.saveDraft.mockResolvedValue(undefined);
    repository.clearDraft.mockResolvedValue(undefined);
    createStore();
  });
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });
  it('loads one entry page without eagerly loading history and replaces entries on explicit navigation', () => {
    journal.read
      .mockReturnValueOnce(of({ ...view, entries: [entry], totalItems: 31, nextPage: 2 }))
      .mockReturnValueOnce(
        of({ ...view, entries: [{ ...entry, id: 'older' }], page: 2, totalItems: 31 }),
      );
    store.load(scope);
    expect(journal.read).toHaveBeenLastCalledWith(scope, 1);
    expect(journal.readVersions).not.toHaveBeenCalled();
    expect(store.totalItems()).toBe(31);
    expect(store.nextPage()).toBe(2);
    store.loadPage(2);
    expect(journal.read).toHaveBeenLastCalledWith(scope, 2);
    expect(store.entities().map((row) => row.id)).toEqual(['older']);
    expect(store.page()).toBe(2);
    expect(store.nextPage()).toBeNull();
  });
  it('resolves a saved correction target outside page one with a single bounded current-entry read', () => {
    const correction = { ...draft, id: 'entry', baseRevision: 1 };
    journal.read.mockReturnValueOnce(
      of({ ...view, draft: correction, totalItems: 60, nextPage: 2 }),
    );
    store.load(scope);
    expect(journal.read).toHaveBeenCalledExactlyOnceWith(scope, 1);
    expect(journal.readEntry).toHaveBeenCalledExactlyOnceWith(scope, 'entry');
    expect(journal.readVersions).not.toHaveBeenCalled();
    expect(store.entities()).toEqual([]);
    expect(store.draft()).toEqual(correction);
    expect(store.draftEntryCallState().data?.revision).toBe(3);
  });
  it('preserves an off-page saved correction on a hidden current-entry response and permits explicit retry', () => {
    const correction = { ...draft, id: 'entry', baseRevision: 1 };
    journal.read.mockReturnValueOnce(
      of({ ...view, draft: correction, totalItems: 60, nextPage: 2 }),
    );
    journal.readEntry.mockReturnValueOnce(
      throwError(() => ({ status: 404, message: 'Entry hidden' })),
    );
    store.load(scope);
    expect(store.draftEntryCallState().status).toBe('error');
    expect(store.draft()).toEqual(correction);
    store.reviewDraft();
    expect(store.draftEntryCallState().status).toBe('success');
    expect(store.draft()).toEqual(correction);
  });
  it('excludes a late saved-correction target after journal authority changes', () => {
    const correction = { ...draft, id: 'entry', baseRevision: 1 };
    const stale = new Subject<{ id: string; entry: InterventionTimeEntryView }>();
    journal.read.mockReturnValueOnce(of({ ...view, draft: correction }));
    journal.readEntry.mockReturnValueOnce(stale);
    store.load({ ...scope, manageOthers: true });
    store.load({ ...scope, manageOthers: false });
    stale.next({ id: 'entry', entry });
    expect(store.draftEntryCallState().status).toBe('idle');
    expect(store.draftEntryCallState().data).toBeNull();
  });
  it('retries the same failed entry page without reverting to page one', () => {
    store.load(scope);
    journal.read
      .mockReturnValueOnce(throwError(() => new Error('Page unavailable')))
      .mockReturnValueOnce(of({ ...view, page: 2, totalItems: 31 }));
    store.loadPage(2);
    expect(store.readCallState().status).toBe('error');
    expect(store.page()).toBe(2);
    store.load(scope);
    expect(journal.read).toHaveBeenLastCalledWith(scope, 2);
    expect(store.readCallState().status).toBe('success');
  });
  it('cancels obsolete page reads and keeps durable input during navigation', async () => {
    store.load(scope);
    store.saveDraft({ scope, draft });
    await vi.waitFor(() => expect(store.draftCallState().status).toBe('success'));
    const stale = new Subject<InterventionTimeJournalView>();
    journal.read.mockReturnValueOnce(stale).mockReturnValueOnce(of({ ...view, page: 3, draft }));
    store.loadPage(2);
    store.loadPage(3);
    expect(stale.observed).toBe(false);
    expect(store.page()).toBe(3);
    expect(store.draft()).toEqual(draft);
  });
  it('loads and appends history only on explicit expansion and cursor continuation', () => {
    journal.read.mockReturnValue(of({ ...view, entries: [entry] }));
    store.load(scope);
    expect(journal.readVersions).not.toHaveBeenCalled();
    store.loadHistory({ entryId: 'entry' });
    expect(journal.readVersions).toHaveBeenLastCalledWith(scope, 'entry', undefined);
    store.loadHistory({ entryId: 'entry' });
    expect(journal.readVersions).toHaveBeenCalledOnce();
    journal.readVersions.mockReturnValueOnce(of(history([1], null)));
    store.loadHistory({ entryId: 'entry', more: true });
    expect(journal.readVersions).toHaveBeenLastCalledWith(scope, 'entry', 2);
    expect(store.historyCallStates()['entry']?.data?.versions.map((row) => row.revision)).toEqual([
      3, 2, 1,
    ]);
    expect(store.historyCallStates()['entry']?.data?.totalItems).toBe(3);
    expect(store.historyCallStates()['entry']?.data?.nextBeforeRevision).toBeNull();
    store.loadHistory({ entryId: 'entry', more: true });
    expect(journal.readVersions).toHaveBeenCalledTimes(2);
  });
  it('retains loaded history pages and retries an identical failed continuation cursor', () => {
    journal.read.mockReturnValue(of({ ...view, entries: [entry] }));
    store.load(scope);
    store.loadHistory({ entryId: 'entry' });
    journal.readVersions
      .mockReturnValueOnce(throwError(() => new Error('History unavailable')))
      .mockReturnValueOnce(of(history([1], null)));
    store.loadHistory({ entryId: 'entry', more: true });
    expect(store.historyCallStates()['entry']?.status).toBe('error');
    expect(store.historyCallStates()['entry']?.data?.versions.map((row) => row.revision)).toEqual([
      3, 2,
    ]);
    expect(store.historyCallStates()['entry']?.data?.nextBeforeRevision).toBe(2);
    store.loadHistory({ entryId: 'entry', more: true });
    expect(journal.readVersions.mock.calls.slice(-2)).toEqual([
      [scope, 'entry', 2],
      [scope, 'entry', 2],
    ]);
    expect(store.historyCallStates()['entry']?.status).toBe('success');
  });
  it('ignores late history after leaving and reopening the same journal', () => {
    journal.read.mockReturnValue(of({ ...view, entries: [entry] }));
    const stale = new Subject<InterventionTimeEntryVersionsOutput>();
    journal.readVersions.mockReturnValueOnce(stale);
    store.load(scope);
    store.loadHistory({ entryId: 'entry' });
    store.load(null);
    store.load(scope);
    stale.next(history([3, 2, 1], null));
    expect(store.historyCallStates()).toEqual({});
  });
  it('keeps revision history unavailable offline and clears broad history after authority reduction', () => {
    journal.read.mockReturnValueOnce(of({ ...view, entries: [entry], offline: true }));
    store.load({ ...scope, manageOthers: true });
    store.loadHistory({ entryId: 'entry' });
    expect(journal.readVersions).not.toHaveBeenCalled();
    store.load({ ...scope, manageOthers: false });
    expect(store.page()).toBe(1);
    expect(store.historyCallStates()).toEqual({});
  });
  it('cancels obsolete journal reads', () => {
    const pending = new Subject<InterventionTimeJournalView>();
    journal.read.mockReturnValueOnce(pending);
    store.load(scope);
    store.load({ ...scope, workItemId: 'next' });
    expect(pending.observed).toBe(false);
    expect(store.scope()?.workItemId).toBe('next');
  });
  it('does not reopen broad journal authority when an earlier manager write finishes', () => {
    const broad = { ...scope, manageOthers: true };
    const restricted = { ...scope, manageOthers: false };
    const accepted = new Subject<'remote' | 'queued'>();
    journal.write.mockReturnValueOnce(accepted);
    store.load(broad);
    store.write({ scope: broad, command: { kind: 'cancel', id: 'entry', revision: 1 } });
    store.load(restricted);
    accepted.next('remote');
    expect(store.scope()).toEqual(restricted);
    expect(journal.read).toHaveBeenLastCalledWith(restricted, 1);
    expect(store.writeCallState().status).toBe('idle');
  });
  it('ignores earlier draft persistence after the same task loses broad journal authority', async () => {
    const broad = { ...scope, manageOthers: true };
    const restricted = { ...scope, manageOthers: false };
    let release = vi.fn<() => void>();
    repository.saveDraft.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        release = vi.fn(resolve);
      }),
    );
    store.load(broad);
    store.saveDraft({ scope: broad, draft });
    store.load(restricted);
    release();
    await Promise.resolve();
    await Promise.resolve();
    expect(store.scope()).toEqual(restricted);
    expect(store.draftCallState().status).toBe('idle');
    expect(store.persistedDraft()).toBeNull();
  });
  it('cancels obsolete journal reads after a dismissed sheet', () => {
    const pending = new Subject<InterventionTimeJournalView>();
    journal.read.mockReturnValueOnce(pending);
    store.load(scope);
    store.load(null);
    expect(pending.observed).toBe(false);
    expect(store.scope()).toBeNull();
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

  it('warns only for locally failed input and disarms after a successful retry', async () => {
    repository.saveDraft.mockRejectedValueOnce(new Error('Storage quota exceeded'));
    store.load(scope);
    store.saveDraft({ scope, draft });
    await vi.waitFor(() => expect(store.draftCallState().status).toBe('error'));
    TestBed.tick();
    expect(unload().defaultPrevented).toBe(true);

    let release!: () => void;
    repository.saveDraft.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        release = resolve;
      }),
    );
    store.saveDraft({ scope, draft });
    TestBed.tick();
    expect(unload().defaultPrevented).toBe(true);
    release();
    await vi.waitFor(() => expect(store.draftCallState().status).toBe('success'));
    expect(unload().defaultPrevented).toBe(false);
    TestBed.tick();
    expect(unload().defaultPrevented).toBe(false);
  });

  it('does not warn for failed storage of content already present in the durable snapshot', async () => {
    journal.read.mockReturnValueOnce(of({ ...view, draft }));
    store.load(scope);
    repository.saveDraft.mockRejectedValueOnce(new Error('Storage unavailable'));
    store.saveDraft({ scope, draft: { ...draft } });
    await vi.waitFor(() => expect(store.draftCallState().status).toBe('error'));
    TestBed.tick();
    expect(store.hasUnpersistedFailedDraft()).toBe(false);
    expect(unload().defaultPrevented).toBe(false);
  });

  it('does not warn when a network write fails for an already durable draft', () => {
    journal.read.mockReturnValueOnce(of({ ...view, draft }));
    journal.write.mockReturnValueOnce(throwError(() => new Error('Network unavailable')));
    store.load(scope);
    store.write({ scope, command: { kind: 'cancel', id: 'entry', revision: 1 } });
    TestBed.tick();
    expect(store.writeCallState().status).toBe('error');
    expect(unload().defaultPrevented).toBe(false);
  });

  it('does not warn for a draft whose first persistence is still pending', () => {
    repository.saveDraft.mockReturnValueOnce(new Promise<void>(() => undefined));
    store.load(scope);
    store.saveDraft({ scope, draft });
    TestBed.tick();
    expect(unload().defaultPrevented).toBe(false);
  });

  it('removes the browser listener on explicit discard and destruction', async () => {
    const added = vi.spyOn(window, 'addEventListener');
    const removed = vi.spyOn(window, 'removeEventListener');
    repository.saveDraft.mockRejectedValueOnce(new Error('Quota exhausted'));
    store.load(scope);
    store.saveDraft({ scope, draft });
    await vi.waitFor(() => expect(store.hasUnpersistedFailedDraft()).toBe(true));
    TestBed.tick();
    expect(unload().defaultPrevented).toBe(true);
    const firstListener = added.mock.calls.find(([type]) => type === 'beforeunload')?.[1];
    expect(firstListener).toBeTypeOf('function');
    store.saveDraft({ scope, draft: null });
    TestBed.tick();
    expect(unload().defaultPrevented).toBe(false);
    expect(removed).toHaveBeenCalledWith('beforeunload', firstListener);

    repository.saveDraft.mockRejectedValueOnce(new Error('Quota exhausted'));
    store.saveDraft({ scope, draft });
    await vi.waitFor(() => expect(store.hasUnpersistedFailedDraft()).toBe(true));
    TestBed.tick();
    expect(unload().defaultPrevented).toBe(true);
    const lastListener = added.mock.calls.findLast(([type]) => type === 'beforeunload')?.[1];
    expect(lastListener).toBeTypeOf('function');
    TestBed.resetTestingModule();
    expect(unload().defaultPrevented).toBe(false);
    expect(removed).toHaveBeenCalledWith('beforeunload', lastListener);
  });

  it('disarms the departure warning when the failed draft leaves its owning scope', async () => {
    repository.saveDraft.mockRejectedValueOnce(new Error('Quota exhausted'));
    store.load(scope);
    store.saveDraft({ scope, draft });
    await vi.waitFor(() => expect(store.hasUnpersistedFailedDraft()).toBe(true));
    TestBed.tick();
    expect(unload().defaultPrevented).toBe(true);

    store.load({ ...scope, workItemId: 'next' });
    TestBed.tick();
    expect(store.scope()?.workItemId).toBe('next');
    expect(store.hasUnpersistedFailedDraft()).toBe(false);
    expect(unload().defaultPrevented).toBe(false);
  });

  it('does not register browser departure handlers during SSR', async () => {
    TestBed.resetTestingModule();
    const added = vi.spyOn(window, 'addEventListener');
    createStore('server');
    repository.saveDraft.mockRejectedValueOnce(new Error('Storage unavailable'));
    store.load(scope);
    store.saveDraft({ scope, draft });
    await vi.waitFor(() => expect(store.hasUnpersistedFailedDraft()).toBe(true));
    TestBed.tick();
    expect(added.mock.calls.filter(([type]) => type === 'beforeunload')).toEqual([]);
    expect(unload().defaultPrevented).toBe(false);
  });
});
