import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type {
  InterventionConfirmAcceptedEvent,
  InterventionConfirmRequest,
  InterventionWorkItemOutput,
} from '@features/organization/features/interventions/models';
import { InterventionConfirmDialog } from '../intervention-confirm-dialog.component';

const workItem: InterventionWorkItemOutput = {
  '@id': '/api/intervention-work-items/wi-1',
  '@type': 'InterventionWorkItem',
  id: 'wi-1',
  intervention: '/api/interventions/intervention-1',
  action: 'inspection',
  target: '/api/equipment/eq-1',
  targetSummary: { resource: '/api/equipment/eq-1', kind: 'equipment', label: 'Extinguisher A-12' },
  resultResource: null,
  assignee: null,
  assigneeProfile: null,
  source: 'planned',
  status: 'planned',
  required: true,
  skipReason: null,
  revision: 1,
  createdAt: '2026-01-05T09:00:00Z',
  updatedAt: '2026-01-05T09:00:00Z',
};

const content = (): HTMLElement =>
  document.querySelector('[data-testid="intervention-detail-confirm-dialog"]') as HTMLElement;
const inDialog = (selector: string): HTMLElement =>
  content().querySelector(selector) as HTMLElement;
const acceptButton = (): HTMLButtonElement =>
  inDialog('[data-testid="intervention-detail-confirm-accept"]') as HTMLButtonElement;
const skipReasonField = (): HTMLTextAreaElement =>
  inDialog('[data-testid="intervention-detail-skip-reason"]') as HTMLTextAreaElement;

describe('InterventionConfirmDialog', () => {
  let fixture: ComponentFixture<InterventionConfirmDialog>;
  let accepted: InterventionConfirmAcceptedEvent[];
  let dismissed: number;

  const setRequest = async (request: InterventionConfirmRequest | null): Promise<void> => {
    fixture.componentRef.setInput('request', request);
    await fixture.whenStable();
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(InterventionConfirmDialog);
    await fixture.whenStable();

    accepted = [];
    dismissed = 0;
    fixture.componentInstance.accepted.subscribe((event) => accepted.push(event));
    fixture.componentInstance.dismissed.subscribe(() => dismissed++);
  });

  it('should stay closed while no request is pending', () => {
    expect(content()).toBeNull();
  });

  it('should render the abandon copy', async () => {
    await setRequest({ kind: 'abandon' });

    expect(content().textContent).toContain('Abandon intervention');
    expect(content().textContent).toContain('cannot be resumed');
    expect(acceptButton().textContent).toContain('Abandon');
  });

  it('should render the delete-intervention copy', async () => {
    await setRequest({ kind: 'deleteIntervention' });

    expect(content().textContent).toContain('Delete intervention');
    expect(acceptButton().textContent).toContain('Delete');
  });

  it('should render the delete-work-item copy', async () => {
    await setRequest({ kind: 'deleteWorkItem', workItem });

    expect(content().textContent).toContain('Delete work item');
    expect(acceptButton().textContent).toContain('Delete');
  });

  it('should render the skip copy and a reason field', async () => {
    await setRequest({ kind: 'skipWorkItem', workItem });

    expect(content().textContent).toContain('Skip work item');
    expect(acceptButton().textContent).toContain('Skip');
    expect(skipReasonField()).not.toBeNull();
  });

  it('should disable accepting a skip until a reason is typed', async () => {
    await setRequest({ kind: 'skipWorkItem', workItem });

    expect(acceptButton().disabled).toBe(true);

    skipReasonField().value = 'Access denied by tenant.';
    skipReasonField().dispatchEvent(new Event('input'));
    await fixture.whenStable();

    expect(acceptButton().disabled).toBe(false);
  });

  it('should reset the skip reason when a new request opens', async () => {
    await setRequest({ kind: 'skipWorkItem', workItem });
    skipReasonField().value = 'Access denied by tenant.';
    skipReasonField().dispatchEvent(new Event('input'));
    await fixture.whenStable();

    await setRequest(null);
    await setRequest({ kind: 'skipWorkItem', workItem });

    expect(skipReasonField().value).toBe('');
    expect(acceptButton().disabled).toBe(true);
  });

  it('should disable accepting while busy', async () => {
    await setRequest({ kind: 'abandon' });
    fixture.componentRef.setInput('busy', true);
    await fixture.whenStable();

    expect(acceptButton().disabled).toBe(true);
  });

  it('should emit the accepted request without a reason for a non-skip variant', async () => {
    await setRequest({ kind: 'deleteWorkItem', workItem });

    acceptButton().click();

    expect(accepted).toEqual([{ kind: 'deleteWorkItem', workItem }]);
  });

  it('should emit the accepted request with the trimmed reason for a skip', async () => {
    await setRequest({ kind: 'skipWorkItem', workItem });
    skipReasonField().value = '  Access denied by tenant.  ';
    skipReasonField().dispatchEvent(new Event('input'));
    await fixture.whenStable();

    acceptButton().click();

    expect(accepted).toEqual([
      { kind: 'skipWorkItem', workItem, reason: 'Access denied by tenant.' },
    ]);
  });

  it('should emit dismissed on Cancel without emitting accepted', async () => {
    await setRequest({ kind: 'abandon' });

    (inDialog('[hlmAlertDialogCancel]') as HTMLButtonElement).click();

    expect(dismissed).toBe(1);
    expect(accepted).toEqual([]);
  });
});
