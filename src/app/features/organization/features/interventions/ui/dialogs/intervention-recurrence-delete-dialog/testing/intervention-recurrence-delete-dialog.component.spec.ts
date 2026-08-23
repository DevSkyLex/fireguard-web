import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { InterventionRecurrenceOutput } from '@features/organization/features/interventions/models';
import { InterventionRecurrenceDeleteDialog } from '../intervention-recurrence-delete-dialog.component';

const recurrence: InterventionRecurrenceOutput = {
  '@id': '/api/intervention-recurrences/recurrence-1',
  '@type': 'InterventionRecurrence',
  id: 'recurrence-1',
  organization: '/api/organizations/org-1',
  template: '/api/interventions/template-1',
  name: 'Monthly extinguisher check',
  site: null,
  responsible: null,
  frequency: 'monthly',
  interval: 1,
  anchorDate: '2026-01-05T09:00:00Z',
  timezone: 'Europe/Paris',
  leadTimeDays: 3,
  nextOccurrenceAt: '2026-02-05T09:00:00Z',
  lastMaterializedAt: null,
  isActive: true,
  endAt: null,
  createdAt: '2026-01-05T09:00:00Z',
  updatedAt: '2026-01-05T09:00:00Z',
};

const content = (): HTMLElement | null =>
  document.querySelector('[data-testid="intervention-recurrence-delete-dialog"]');
const confirmButton = (): HTMLButtonElement =>
  content()?.querySelector(
    '[data-testid="intervention-recurrence-delete-dialog-confirm"]',
  ) as HTMLButtonElement;
const cancelButton = (): HTMLButtonElement =>
  content()?.querySelector(
    '[data-testid="intervention-recurrence-delete-dialog-cancel"]',
  ) as HTMLButtonElement;

describe('InterventionRecurrenceDeleteDialog', () => {
  let fixture: ComponentFixture<InterventionRecurrenceDeleteDialog>;
  let confirmed: InterventionRecurrenceOutput[];
  let dismissed: number;

  const setRecurrence = async (value: InterventionRecurrenceOutput | null): Promise<void> => {
    fixture.componentRef.setInput('recurrence', value);
    await fixture.whenStable();
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(InterventionRecurrenceDeleteDialog);
    await fixture.whenStable();

    confirmed = [];
    dismissed = 0;
    fixture.componentInstance.confirmed.subscribe((event) => confirmed.push(event));
    fixture.componentInstance.dismissed.subscribe(() => dismissed++);
  });

  it('should stay closed while no recurrence is pending', () => {
    expect(content()).toBeNull();
  });

  it('should emit the confirmed recurrence', async () => {
    await setRecurrence(recurrence);

    confirmButton().click();

    expect(confirmed).toEqual([recurrence]);
  });

  it('should emit dismissed on Cancel without emitting confirmed', async () => {
    await setRecurrence(recurrence);

    cancelButton().click();

    expect(dismissed).toBe(1);
    expect(confirmed).toEqual([]);
  });
});
