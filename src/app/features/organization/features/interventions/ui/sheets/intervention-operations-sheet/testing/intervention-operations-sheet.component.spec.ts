import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { INTERACTION_CAPABILITIES_PORT } from '@core/interaction-capabilities';
import { errorCallState, idleCallState, pendingCallState, toStoreError } from '@core/request-state';
import type {
  InterventionOutboxOperationFor,
  InterventionOutboxPayloadMap,
  InterventionOutboxType,
  InterventionWorkItemOutput,
} from '@features/organization/features/interventions/models';
import { InterventionOperationsSheet } from '../intervention-operations-sheet.component';

function operation<Type extends InterventionOutboxType>(
  id: string,
  type: Type,
  payload: InterventionOutboxPayloadMap[Type],
): InterventionOutboxOperationFor<Type> {
  return {
    id,
    interventionId: 'intervention-1',
    type,
    payload,
    createdAt: '2026-09-16T09:00:00Z',
  };
}

const sheet = (): HTMLElement | null =>
  document.querySelector('[data-testid="intervention-operations-sheet"]');
const row = (id: string): HTMLElement | null =>
  sheet()?.querySelector(`[data-operation-id="${id}"]`) ?? null;
const button = (container: Element | null, text: string): HTMLButtonElement | undefined =>
  Array.from(container?.querySelectorAll('button') ?? []).find((item) =>
    item.textContent?.includes(text),
  );

describe('InterventionOperationsSheet', () => {
  let fixture: ComponentFixture<InterventionOperationsSheet>;
  let resolved: Array<{
    id: string;
    action: 'retry' | 'discard';
    workloadToken?: string;
    reviewedRevision?: number;
  }>;
  let reloads: number;
  let visibility: boolean[];

  const open = async (): Promise<void> => {
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        {
          provide: INTERACTION_CAPABILITIES_PORT,
          useValue: { isMobileInteractionMode: signal(false) },
        },
      ],
    });
    fixture = TestBed.createComponent(InterventionOperationsSheet);
    fixture.componentRef.setInput('callState', idleCallState());
    fixture.componentRef.setInput('interventionName', 'Annual fire check');
    await fixture.whenStable();
    resolved = [];
    reloads = 0;
    visibility = [];
    fixture.componentInstance.resolved.subscribe((value) => resolved.push(value));
    fixture.componentInstance.reloadRequested.subscribe(() => reloads++);
    fixture.componentInstance.visibleChange.subscribe((value) => visibility.push(value));
  });

  afterEach(() => fixture.destroy());

  it('shows loading, a truthful empty state and a retryable local-read failure', async () => {
    expect(sheet()).toBeNull();
    fixture.componentRef.setInput('callState', pendingCallState());
    await open();
    expect(sheet()?.textContent).toContain('Reading saved operations');
    expect(sheet()?.textContent).not.toContain('No operations waiting');

    fixture.componentRef.setInput('callState', idleCallState());
    await fixture.whenStable();
    expect(sheet()?.textContent).toContain('No operations waiting');

    fixture.componentRef.setInput(
      'callState',
      errorCallState(toStoreError(new Error('Device storage unavailable'))),
    );
    await fixture.whenStable();
    expect(sheet()?.querySelector('[role="alert"]')?.textContent).toContain(
      'Device storage unavailable',
    );
    button(sheet(), 'Retry')?.click();
    expect(reloads).toBe(1);
  });

  it('keeps a readable local preview for time, file, named resource and comment operations', async () => {
    fixture.componentRef.setInput('workItems', [
      { id: 'work-1', targetSummary: { label: 'Extinguisher A-12' } },
    ] as InterventionWorkItemOutput[]);
    fixture.componentRef.setInput('operations', [
      operation('time', 'time-entry.create', {
        id: 'entry-1',
        workItemId: 'work-1',
        actorId: 'member-1',
        memberId: 'member-1',
        workedOn: '2026-09-16',
        minutes: 90,
        note: 'Valve checked',
      }),
      operation('file', 'attachment.upload', {
        file: new Blob(['photo']),
        fileName: 'proof.jpg',
        mimeType: 'image/jpeg',
        size: 5,
      }),
      operation('facility', 'facility.create', { name: 'North wing', type: 'building' }),
      operation('comment', 'comment.create', { body: 'Checked on site.' }),
    ]);
    await open();

    expect(row('time')?.textContent).toContain('Extinguisher A-12');
    expect(row('time')?.textContent).toContain('Valve checked');
    expect(row('file')?.textContent).toContain('proof.jpg');
    expect(row('facility')?.textContent).toContain('North wing');
    expect(row('comment')?.textContent).toContain('Checked on site.');
    expect(row('comment')?.textContent).toContain('Annual fire check');
    expect(row('file')?.textContent).not.toContain('photo');
  });

  it('disables retry offline while keeping discard available, then locks both during synchronization', async () => {
    fixture.componentRef.setInput('operations', [
      operation('comment', 'comment.create', { body: 'Saved note' }),
    ]);
    fixture.componentRef.setInput('online', false);
    await open();

    expect(button(row('comment'), 'Review and retry')?.disabled).toBe(true);
    expect(button(row('comment'), 'Discard local operation')?.disabled).toBe(false);

    fixture.componentRef.setInput('online', true);
    fixture.componentRef.setInput('syncing', true);
    await fixture.whenStable();
    expect(button(row('comment'), 'Review and retry')?.disabled).toBe(true);
    expect(button(row('comment'), 'Discard local operation')?.disabled).toBe(true);
  });

  it('retries a failed operation directly but requires explicit review for a conflict', async () => {
    const failed = {
      ...operation('failed', 'comment.create', { body: 'Saved note' }),
      status: 'failed' as const,
    };
    const conflict = {
      ...operation('conflict', 'work-item.update', { workItemId: 'work-1', status: 'completed' }),
      status: 'conflict' as const,
      baseRevision: 2,
      serverRevision: 5,
      serverValues: { status: 'in_progress' },
    };
    fixture.componentRef.setInput('operations', [failed, conflict]);
    await open();

    button(row('failed'), 'Review and retry')?.click();
    expect(resolved).toEqual([{ id: 'failed', action: 'retry' }]);

    button(row('conflict'), 'Review and retry')?.click();
    await fixture.whenStable();
    expect(resolved).toHaveLength(1);
    expect(fixture.componentInstance['confirmedOperation']()).toEqual(conflict);
    expect(document.body.textContent).toContain('Current server values');
    expect(row('conflict')?.textContent).toContain('Original local revision: 2');
    expect(row('conflict')?.textContent).toContain('Last confirmed server revision: 5');

    fixture.componentInstance['confirm']();
    expect(resolved).toEqual([
      { id: 'failed', action: 'retry' },
      { id: 'conflict', action: 'retry', reviewedRevision: 5 },
    ]);
    expect(fixture.componentInstance['confirmedOperation']()).toBeNull();
  });

  it('requires confirmation before discarding and does not imply a verified revision', async () => {
    const conflict = {
      ...operation('conflict', 'intervention.update', { description: 'Local report' }),
      status: 'conflict' as const,
      serverValues: { description: 'Server report' },
      serverRevision: null,
    };
    fixture.componentRef.setInput('operations', [conflict]);
    await open();
    expect(row('conflict')?.textContent).toContain('The server revision could not be verified');

    button(row('conflict'), 'Discard local operation')?.click();
    await fixture.whenStable();
    expect(resolved).toEqual([]);
    expect(document.body.textContent).toContain('This cannot be undone');

    fixture.componentInstance['confirmation'].set(null);
    await fixture.whenStable();
    expect(resolved).toEqual([]);

    button(row('conflict'), 'Discard local operation')?.click();
    fixture.componentInstance['confirm']();
    expect(resolved).toEqual([{ id: 'conflict', action: 'discard' }]);
  });

  it('sends only the reviewed overload token for the selected queued operation', async () => {
    const assessment = {
      confirmationRequired: true,
      confirmationToken: 'opaque-token',
      completeness: 'partial' as const,
      increases: [
        {
          memberId: 'member-1',
          memberName: 'Alex',
          date: '2026-09-16',
          reason: 'daily_overload' as const,
          beforeMinutes: 0,
          afterMinutes: 60,
          capacityMinutes: 420,
        },
      ],
    };
    const overloaded = {
      ...operation('overloaded', 'work-item.update', {
        workItemId: 'work-1',
        assignee: '/api/organization-members/member-1',
      }),
      status: 'conflict' as const,
      workloadAssessment: assessment,
    };
    fixture.componentRef.setInput('operations', [
      overloaded,
      operation('unrelated', 'comment.create', { body: 'Other work' }),
    ]);
    await open();

    button(row('overloaded'), 'Review and retry')?.click();
    await fixture.whenStable();
    expect(fixture.componentInstance['workloadReview']()).toEqual(overloaded);
    expect(resolved).toEqual([]);

    fixture.componentInstance['confirmWorkload']('opaque-token');
    expect(resolved).toEqual([
      { id: 'overloaded', action: 'retry', workloadToken: 'opaque-token' },
    ]);
    expect(fixture.componentInstance['workloadReview']()).toBeNull();
  });

  it('closes without changing any queued operation', async () => {
    fixture.componentRef.setInput('operations', [
      operation('comment', 'comment.create', { body: 'Saved note' }),
    ]);
    await open();
    fixture.componentRef.setInput('visible', false);
    await fixture.whenStable();

    expect(sheet()).toBeNull();
    expect(resolved).toEqual([]);
    expect(visibility).toEqual([true, false]);
  });
});
