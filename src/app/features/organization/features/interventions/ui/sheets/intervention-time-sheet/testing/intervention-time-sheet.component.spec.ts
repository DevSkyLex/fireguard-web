import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideInteractionCapabilities } from '@core/interaction-capabilities';
import {
  errorCallState,
  idleCallState,
  pendingCallState,
  successCallState,
  toStoreError,
} from '@core/request-state';
import type {
  InterventionTimeDraft,
  InterventionTimeEntryView,
  InterventionTimeWrite,
  InterventionWorkItemOutput,
} from '@features/organization/features/interventions/models';
import { InterventionTimeForm } from '@features/organization/features/interventions/ui/forms/intervention-time-form';
import { InterventionTimeSheet } from '../intervention-time-sheet.component';

/**
 * Constant actions
 * @description Actor capabilities returned by the server for this task.
 * @since 1.0.0
 */
const actions = {
  canLogTime: true,
  canManageTime: false,
  canReestimate: true,
  canReassign: false,
  canEditPlanning: false,
};

/**
 * Constant item
 * @description A task whose journal has an independent revision history.
 * @since 1.0.0
 */
const item: InterventionWorkItemOutput = {
  '@id': '/api/interventions/visit/work-items/task-1',
  '@type': 'InterventionWorkItem',
  id: 'task-1',
  intervention: '/api/interventions/visit',
  action: 'inspection',
  target: null,
  resultResource: null,
  assignee: null,
  source: 'planned',
  status: 'in_progress',
  required: true,
  skipReason: null,
  evidenceCount: 0,
  revision: 30,
  createdAt: '2026-09-21T09:00:00Z',
  updatedAt: '2026-09-21T09:00:00Z',
  allowedActions: actions,
};

/**
 * Function entry
 * @description Builds a persisted journal entry, separate from local synchronization state.
 * @access private
 * @since 1.0.0
 * @param {Partial<InterventionTimeEntryView>} overrides - Revision, author or synchronization state.
 * @returns {InterventionTimeEntryView} Journal row fixture.
 */
const entry = (overrides: Partial<InterventionTimeEntryView> = {}): InterventionTimeEntryView => ({
  id: 'entry-1',
  workItemId: 'task-1',
  memberId: 'member-1',
  workedOn: '2026-09-20',
  minutes: 60,
  note: null,
  revision: 4,
  cancelled: false,
  createdBy: 'member-1',
  updatedBy: 'member-1',
  createdAt: '2026-09-21T09:00:00Z',
  updatedAt: '2026-09-21T09:00:00Z',
  versions: [],
  ...overrides,
});

/**
 * Constant draft
 * @description A local correction that must preserve its stable identifier and captured revision.
 * @since 1.0.0
 */
const draft: InterventionTimeDraft = {
  id: 'entry-1',
  memberId: 'member-1',
  workedOn: '2026-09-20',
  minutes: '90',
  note: 'Unfinished correction',
  baseRevision: 4,
};

describe('InterventionTimeSheet', () => {
  let fixture: ComponentFixture<InterventionTimeSheet>;
  let writes: InterventionTimeWrite[];
  let drafts: (InterventionTimeDraft | null)[];
  let closed: ReturnType<typeof vi.fn<() => void>>;

  beforeEach(async () => {
    vi.stubGlobal(
      'ResizeObserver',
      vi.fn(function () {
        return { observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() };
      }),
    );
    TestBed.configureTestingModule({ providers: [provideInteractionCapabilities()] });
    fixture = TestBed.createComponent(InterventionTimeSheet);
    fixture.componentRef.setInput('item', item);
    fixture.componentRef.setInput('actorId', 'member-1');
    fixture.componentRef.setInput('today', '2026-09-21');
    fixture.componentRef.setInput('readState', idleCallState());
    fixture.componentRef.setInput('writeState', idleCallState());
    fixture.componentRef.setInput('draftState', idleCallState());
    writes = [];
    drafts = [];
    closed = vi.fn<() => void>();
    fixture.componentInstance.submitted.subscribe((value) => writes.push(value));
    fixture.componentInstance.draftChanged.subscribe((value) => drafts.push(value));
    fixture.componentInstance.closed.subscribe(closed);
    await fixture.whenStable();
  });

  afterEach(() => {
    fixture.destroy();
    vi.unstubAllGlobals();
  });

  it('starts a fresh journal draft for the actor without borrowing the work item revision', async () => {
    fixture.componentInstance['begin']();
    await fixture.whenStable();
    expect(fixture.componentInstance['editing']()).toEqual({
      id: expect.stringMatching(/^[0-9a-f-]{36}$/),
      memberId: 'member-1',
      workedOn: '2026-09-21',
      minutes: '',
      note: '',
      baseRevision: null,
    });
    expect(writes).toEqual([]);
  });

  it('resumes the same persisted draft and forwards form writes without changing their identity', async () => {
    fixture.componentRef.setInput('draft', draft);
    fixture.componentInstance['begin']();
    await fixture.whenStable();
    expect(fixture.componentInstance['editing']()).toEqual(draft);
    const form = fixture.debugElement.query(By.directive(InterventionTimeForm))
      .componentInstance as InterventionTimeForm;
    const write: InterventionTimeWrite = {
      kind: 'correct',
      revision: 4,
      input: {
        id: 'entry-1',
        memberId: 'member-1',
        workedOn: '2026-09-20',
        minutes: 90,
        note: 'Reviewed correction',
      },
    };
    form.submitted.emit(write);
    form.draftChanged.emit({ ...draft, note: 'Further input' });
    expect(writes).toEqual([write]);
    expect(drafts.at(-1)).toEqual({ ...draft, note: 'Further input' });
    form.cancelled.emit();
    expect(fixture.componentInstance['editing']()).toBeNull();
  });

  it('initializes a correction from the entry revision and preserves an existing correction draft', async () => {
    fixture.componentInstance['correct'](entry());
    expect(fixture.componentInstance['editing']()).toEqual({
      id: 'entry-1',
      memberId: 'member-1',
      workedOn: '2026-09-20',
      minutes: '60',
      note: '',
      baseRevision: 4,
    });
    fixture.componentRef.setInput('draft', draft);
    fixture.componentInstance['correct'](entry());
    expect(fixture.componentInstance['editing']()).toEqual(draft);
    fixture.componentInstance['correct'](entry({ id: 'entry-other' }));
    expect(fixture.componentInstance['editing']()).toEqual(draft);
  });

  it('allows correction only for an authorized contributor and a persisted active entry', async () => {
    const sheet = fixture.componentInstance;
    expect(sheet['canCorrect'](entry())).toBe(true);
    expect(sheet['canCorrect'](entry({ memberId: 'member-other' }))).toBe(false);
    expect(sheet['canCorrect'](entry({ cancelled: true }))).toBe(false);
    for (const syncStatus of ['pending', 'conflict', 'failed'] as const) {
      expect(sheet['canCorrect'](entry({ syncStatus }))).toBe(false);
    }
    fixture.componentRef.setInput('item', {
      ...item,
      allowedActions: { ...actions, canLogTime: false },
    });
    expect(sheet['canCorrect'](entry())).toBe(false);
    fixture.componentRef.setInput('item', {
      ...item,
      allowedActions: { ...actions, canLogTime: false, canManageTime: true },
    });
    expect(sheet['canCorrect'](entry({ memberId: 'member-other' }))).toBe(true);
  });

  it('resolves member labels by membership id and preserves unknown contributor identifiers', async () => {
    fixture.componentRef.setInput('members', [
      {
        value: '/api/organizations/org-1/members/member-1',
        label: 'Marie Lefèvre',
        displayName: 'Marie Lefèvre',
        roleLabel: 'Inspector',
        avatarUrl: null,
        initials: 'ML',
      },
    ]);
    expect(fixture.componentInstance['memberName']('member-1')).toBe('Marie Lefèvre');
    expect(fixture.componentInstance['memberName']('former-member')).toBe('former-member');
  });

  it('submits an explicit cancellation once with the captured journal revision', async () => {
    const sheet = fixture.componentInstance;
    sheet['confirmCancellation']();
    expect(writes).toEqual([]);
    sheet['cancelling'].set(entry());
    fixture.componentRef.setInput('writeState', pendingCallState());
    sheet['confirmCancellation']();
    expect(writes).toEqual([]);
    expect(sheet['cancelling']()).toEqual(entry());
    fixture.componentRef.setInput('writeState', idleCallState());
    sheet['confirmCancellation']();
    sheet['confirmCancellation']();
    expect(writes).toEqual([{ kind: 'cancel', id: 'entry-1', revision: 4 }]);
    expect(sheet['cancelling']()).toBeNull();
  });

  it('requires explicit review before rebasing a stale correction and keeps all local input', async () => {
    const sheet = fixture.componentInstance;
    fixture.componentRef.setInput('draft', draft);
    fixture.componentRef.setInput('entries', [entry({ revision: 7, note: 'Server correction' })]);
    sheet['reviewingDraft'].set(true);
    expect(sheet['draftServerEntry']()?.revision).toBe(7);
    sheet['reviewCorrection']();
    expect(drafts).toEqual([{ ...draft, baseRevision: 7 }]);
    expect(sheet['editing']()).toEqual({ ...draft, baseRevision: 7 });
    expect(sheet['reviewingDraft']()).toBe(false);
    expect(writes).toEqual([]);
  });

  it('does not rebase new drafts, matching revisions, local pending rows or cancelled server entries', async () => {
    const sheet = fixture.componentInstance;
    sheet['reviewCorrection']();
    fixture.componentRef.setInput('draft', { ...draft, baseRevision: null });
    fixture.componentRef.setInput('entries', [entry({ revision: 7 })]);
    expect(sheet['draftServerEntry']()).toBeNull();
    fixture.componentRef.setInput('draft', draft);
    fixture.componentRef.setInput('entries', [entry()]);
    expect(sheet['draftServerEntry']()).toBeNull();
    fixture.componentRef.setInput('entries', [entry({ revision: 7, syncStatus: 'pending' })]);
    expect(sheet['draftServerEntry']()).toBeNull();
    fixture.componentRef.setInput('entries', [entry({ revision: 7, cancelled: true })]);
    sheet['reviewCorrection']();
    expect(drafts).toEqual([]);
    expect(sheet['editing']()).toBeNull();
  });

  it('retains the correction on a failed write and clears it only when a pending write succeeds', async () => {
    const sheet = fixture.componentInstance;
    sheet['correct'](entry());
    fixture.componentRef.setInput('writeState', pendingCallState());
    await fixture.whenStable();
    fixture.componentRef.setInput(
      'writeState',
      errorCallState(toStoreError(new Error('Conflict'))),
    );
    await fixture.whenStable();
    expect(sheet['editing']()?.id).toBe('entry-1');
    fixture.componentRef.setInput('writeState', pendingCallState());
    await fixture.whenStable();
    fixture.componentRef.setInput('writeState', successCallState(null));
    await fixture.whenStable();
    expect(sheet['editing']()).toBeNull();
  });

  it('protects pending writes and failed device persistence before allowing the sheet to close', async () => {
    const sheet = fixture.componentInstance;
    fixture.componentRef.setInput('writeState', pendingCallState());
    sheet['requestClose']();
    expect(closed).not.toHaveBeenCalled();
    fixture.componentRef.setInput('writeState', idleCallState());
    fixture.componentRef.setInput('draftState', pendingCallState());
    sheet['requestClose']();
    expect(closed).not.toHaveBeenCalled();
    fixture.componentRef.setInput(
      'draftState',
      errorCallState(toStoreError(new Error('Disk full'))),
    );
    sheet['requestClose']();
    expect(sheet['discardOnClose']()).toBe(true);
    expect(closed).not.toHaveBeenCalled();
    fixture.componentRef.setInput('draftState', successCallState(null));
    sheet['requestClose']();
    expect(closed).toHaveBeenCalledOnce();
  });

  it('distinguishes unavailable offline history from a confirmed empty journal', async () => {
    fixture.componentRef.setInput('offline', true);
    fixture.componentRef.setInput('historyUnavailable', true);
    await fixture.whenStable();
    expect(document.body.textContent).toContain('No journal has been saved on this device.');
    expect(document.body.textContent).toContain('Global workload is unavailable offline.');
    expect(document.body.textContent).not.toContain('No time logged yet');
  });
});
