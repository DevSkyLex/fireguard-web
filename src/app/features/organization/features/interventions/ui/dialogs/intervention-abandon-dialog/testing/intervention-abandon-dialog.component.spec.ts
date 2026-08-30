import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { InterventionOutput } from '@features/organization/features/interventions/models';
import { InterventionAbandonDialog } from '../intervention-abandon-dialog.component';

const intervention: InterventionOutput = {
  '@id': '/api/interventions/intervention-1',
  '@type': 'Intervention',
  id: 'intervention-1',
  organization: '/api/organizations/org-1',
  number: 142,
  type: 'inspection_campaign',
  name: 'Q1 sprinkler inspection',
  description: null,
  status: 'in_progress',
  allowedTransitions: ['submitted', 'abandoned'],
  site: '/api/facilities/site-1',
  responsible: null,
  participants: [],
  labels: [],
  priority: 'normal',
  plannedStartAt: null,
  dueAt: null,
  reviewNote: null,
  revision: 3,
  facilitiesCount: 0,
  equipmentCount: 0,
  inspectionsCount: 0,
  blockersCount: 0,
  workItemsCount: 0,
  completedWorkItemsCount: 0,
  proposedChangesCount: 0,
  commentsCount: 0,
  hasSignature: false,
  createdAt: '2026-01-05T09:00:00Z',
  updatedAt: '2026-01-05T09:00:00Z',
};

const content = (): HTMLElement | null =>
  document.querySelector('[data-testid="intervention-abandon-dialog"]');
const confirmButton = (): HTMLButtonElement =>
  content()?.querySelector('[data-testid="intervention-abandon-confirm"]') as HTMLButtonElement;
const cancelButton = (): HTMLButtonElement =>
  content()?.querySelector('[hlmAlertDialogCancel]') as HTMLButtonElement;

describe('InterventionAbandonDialog', () => {
  let fixture: ComponentFixture<InterventionAbandonDialog>;
  let confirmed: number;
  let dismissed: number;

  const setInputs = async (
    request: InterventionOutput | null,
    pending: boolean = false,
  ): Promise<void> => {
    fixture.componentRef.setInput('request', request);
    fixture.componentRef.setInput('pending', pending);
    await fixture.whenStable();
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(InterventionAbandonDialog);
    await fixture.whenStable();

    confirmed = 0;
    dismissed = 0;
    fixture.componentInstance.confirmed.subscribe(() => confirmed++);
    fixture.componentInstance.dismissed.subscribe(() => dismissed++);
  });

  it('should stay closed while nothing is pending abandonment', () => {
    expect(content()).toBeNull();
  });

  it('should name the intervention by its code', async () => {
    await setInputs(intervention);

    expect(content()?.textContent).toContain('FG-142');
  });

  it('should state that the record becomes read-only and cannot be resumed', async () => {
    await setInputs(intervention);

    const text: string = content()?.textContent ?? '';

    expect(text).toContain('read-only');
    expect(text).toContain('cannot be resumed');
  });

  it('should collect no reason, since the workflow discards one on this transition', async () => {
    await setInputs(intervention);

    expect(content()?.querySelector('textarea')).toBeNull();
    expect(content()?.querySelector('input')).toBeNull();
  });

  it('should emit confirmed on the accept button', async () => {
    await setInputs(intervention);

    confirmButton().click();

    expect(confirmed).toBe(1);
  });

  it('should not emit confirmed while the transition is in flight', async () => {
    await setInputs(intervention, true);

    expect(confirmButton().disabled).toBe(true);

    confirmButton().click();

    expect(confirmed).toBe(0);
  });

  it('should emit dismissed on Cancel without emitting confirmed', async () => {
    await setInputs(intervention);

    cancelButton().click();

    expect(dismissed).toBe(1);
    expect(confirmed).toBe(0);
  });
});
