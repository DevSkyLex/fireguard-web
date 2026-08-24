import { provideZonelessChangeDetection, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type {
  InterventionRecurrenceFormValues,
  InterventionRecurrenceOutput,
} from '@features/organization/features/interventions/models';
import { InterventionRecurrenceForm } from '../intervention-recurrence-form.component';
import type { InterventionRecurrenceFormDraft } from '../models';

const recurrence = (
  overrides: Partial<InterventionRecurrenceOutput> = {},
): InterventionRecurrenceOutput =>
  ({
    '@id': '/api/intervention-recurrences/recurrence-1',
    '@type': 'InterventionRecurrence',
    id: 'recurrence-1',
    organization: '/api/organizations/org-1',
    template: '/api/intervention-templates/template-1',
    name: 'Monthly extinguisher check',
    site: null,
    responsible: null,
    frequency: 'monthly',
    interval: 1,
    anchorDate: '2026-01-15T00:00:00Z',
    timezone: 'Europe/Paris',
    leadTimeDays: 7,
    nextOccurrenceAt: '2026-02-15T00:00:00Z',
    lastMaterializedAt: null,
    isActive: true,
    endAt: null,
    createdAt: '',
    updatedAt: '',
    ...overrides,
  }) as InterventionRecurrenceOutput;

const validDraft: InterventionRecurrenceFormDraft = {
  name: 'Monthly extinguisher check',
  templateId: 'template-1',
  site: null,
  responsible: null,
  frequency: 'monthly',
  interval: 1,
  anchorDate: new Date('2026-01-15T00:00:00.000Z'),
  timezone: 'Europe/Paris',
  leadTimeDays: 7,
  endAt: null,
};

describe('InterventionRecurrenceForm', () => {
  let fixture: ComponentFixture<InterventionRecurrenceForm>;
  let element: HTMLElement;

  const fill = async (testId: string, value: string): Promise<void> => {
    const input: HTMLInputElement = element.querySelector<HTMLInputElement>(
      `[data-testid="${testId}"]`,
    ) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };

  const submit = async (): Promise<void> => {
    element.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
  };

  const setModel = async (draft: InterventionRecurrenceFormDraft): Promise<void> => {
    (
      fixture.componentInstance as unknown as {
        model: WritableSignal<InterventionRecurrenceFormDraft>;
      }
    ).model.set(draft);
    await fixture.whenStable();
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(InterventionRecurrenceForm);
    await fixture.whenStable();

    element = fixture.nativeElement as HTMLElement;
  });

  it('should stay quiet until a field is touched', () => {
    expect(element.textContent).not.toContain('Give the recurrence a name');
  });

  it('should refuse to emit while the name is missing, and show the reason', async () => {
    const emitted: InterventionRecurrenceFormValues[] = [];
    fixture.componentInstance.submitted.subscribe(
      (values: InterventionRecurrenceFormValues): void => {
        emitted.push(values);
      },
    );

    await setModel({ ...validDraft, name: '' });
    await submit();

    expect(emitted).toEqual([]);
    expect(element.textContent).toContain('Give the recurrence a name');
  });

  it('should reject an interval outside the 1-12 bound', async () => {
    const emitted: InterventionRecurrenceFormValues[] = [];
    fixture.componentInstance.submitted.subscribe(
      (values: InterventionRecurrenceFormValues): void => {
        emitted.push(values);
      },
    );

    await setModel({ ...validDraft, interval: 13 });
    await submit();

    expect(emitted).toEqual([]);
    expect(element.textContent).toContain('Use a value between 1 and 12.');
  });

  it('should emit the typed values once the rules are met, with a null recurrenceId on a create', async () => {
    const emitted: InterventionRecurrenceFormValues[] = [];
    fixture.componentInstance.submitted.subscribe(
      (values: InterventionRecurrenceFormValues): void => {
        emitted.push(values);
      },
    );

    await setModel(validDraft);
    await submit();

    expect(emitted.length).toBe(1);
    expect(emitted[0]).toEqual({
      recurrenceId: null,
      name: 'Monthly extinguisher check',
      templateId: 'template-1',
      site: null,
      responsible: null,
      frequency: 'monthly',
      interval: 1,
      anchorDate: new Date('2026-01-15T00:00:00.000Z'),
      timezone: 'Europe/Paris',
      leadTimeDays: 7,
      endAt: null,
    });
  });

  it('should emit the edited row id as recurrenceId once a recurrence is set', async () => {
    fixture.componentRef.setInput('recurrence', recurrence());
    await fixture.whenStable();

    const emitted: InterventionRecurrenceFormValues[] = [];
    fixture.componentInstance.submitted.subscribe(
      (values: InterventionRecurrenceFormValues): void => {
        emitted.push(values);
      },
    );

    await submit();

    expect(emitted[0]?.recurrenceId).toBe('recurrence-1');
  });

  it('should reseed the draft from the edited recurrence, splitting its template IRI to a bare id', async () => {
    fixture.componentRef.setInput('recurrence', recurrence());
    await fixture.whenStable();

    const nameInput: HTMLInputElement = element.querySelector(
      '[data-testid="intervention-recurrence-name"]',
    ) as HTMLInputElement;

    expect(nameInput.value).toBe('Monthly extinguisher check');
    expect(
      (
        fixture.componentInstance as unknown as {
          model: WritableSignal<InterventionRecurrenceFormDraft>;
        }
      ).model().templateId,
    ).toBe('template-1');
  });

  it('should reset to a blank draft once the recurrence clears', async () => {
    fixture.componentRef.setInput('recurrence', recurrence());
    await fixture.whenStable();

    fixture.componentRef.setInput('recurrence', null);
    await fixture.whenStable();

    const nameInput: HTMLInputElement = element.querySelector(
      '[data-testid="intervention-recurrence-name"]',
    ) as HTMLInputElement;

    expect(nameInput.value).toBe('');
  });

  it('should emit cancelled when the operator backs out', () => {
    let cancelled: boolean = false;
    fixture.componentInstance.cancelled.subscribe((): void => {
      cancelled = true;
    });

    element
      .querySelector<HTMLButtonElement>('[data-testid="intervention-recurrence-cancel"]')
      ?.click();

    expect(cancelled).toBe(true);
  });

  it('should report dirtiness through dirtyChanged as the field tree is touched', async () => {
    const dirtyChanges: boolean[] = [];
    fixture.componentInstance.dirtyChanged.subscribe((dirty: boolean): void => {
      dirtyChanges.push(dirty);
    });
    await fixture.whenStable();

    await fill('intervention-recurrence-name', 'A renamed schedule');

    expect(dirtyChanges.at(-1)).toBe(true);
  });

  it('should lock the submit control while a request is in flight', async () => {
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();

    const button: HTMLButtonElement | null = element.querySelector(
      '[data-testid="intervention-recurrence-submit"]',
    );

    expect(button?.disabled).toBe(true);
    expect(button?.textContent).toContain('Creating…');
  });

  it('should surface the server error message above the form', async () => {
    fixture.componentRef.setInput('serverError', 'This name is already taken.');
    await fixture.whenStable();

    expect(
      element.querySelector('[data-testid="intervention-recurrence-error"]')?.textContent,
    ).toContain('This name is already taken.');
  });
});
