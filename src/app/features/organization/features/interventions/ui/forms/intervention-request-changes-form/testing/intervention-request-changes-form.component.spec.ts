import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { InterventionRequestChangesForm } from '../intervention-request-changes-form.component';
import type { InterventionRequestChangesFormValues } from '../models';

describe('InterventionRequestChangesForm', () => {
  let fixture: ComponentFixture<InterventionRequestChangesForm>;
  let submissions: InterventionRequestChangesFormValues[];

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const note = (): HTMLTextAreaElement =>
    root().querySelector(
      '[data-testid="intervention-request-changes-note"]',
    ) as HTMLTextAreaElement;
  const form = (): HTMLFormElement => root().querySelector('form') as HTMLFormElement;
  const submitButton = (): HTMLButtonElement =>
    root().querySelector(
      '[data-testid="intervention-request-changes-submit"]',
    ) as HTMLButtonElement;

  const type = async (value: string): Promise<void> => {
    note().value = value;
    note().dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };
  const submit = async (): Promise<void> => {
    form().dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(InterventionRequestChangesForm);
    await fixture.whenStable();

    submissions = [];
    fixture.componentInstance.submitted.subscribe((values) => submissions.push(values));
  });

  it('should refuse an empty note, which the agent would have nothing to act on', async () => {
    await submit();

    expect(submissions).toEqual([]);
    expect(root().textContent).toContain('A note is required so the agent knows what to fix.');
  });

  it('should emit the note, trimmed', async () => {
    await type('  Re-check the third floor.  ');
    await submit();

    expect(submissions).toEqual([{ note: 'Re-check the third floor.' }]);
  });

  it('should not submit while the request is in flight', async () => {
    await type('Re-check the third floor.');
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();

    await submit();

    expect(submissions).toEqual([]);
    expect(submitButton().disabled).toBe(true);
  });

  it('should not submit when the reviewer may not act', async () => {
    await type('Re-check the third floor.');
    fixture.componentRef.setInput('disabled', true);
    await fixture.whenStable();

    await submit();

    expect(submissions).toEqual([]);
  });

  it('should keep the note after a rejected request', async () => {
    await type('Re-check the third floor.');
    await submit();
    fixture.componentRef.setInput('serverError', { status: 409, title: 'Conflict' });
    await fixture.whenStable();

    expect(note().value).toBe('Re-check the third floor.');
  });

  it('should surface what the API said about the rejection', async () => {
    fixture.componentRef.setInput('serverError', {
      '@type': 'ConstraintViolation',
      status: 422,
      violations: [{ propertyPath: 'reviewNote', message: 'This note is too vague.' }],
    });
    await fixture.whenStable();

    expect(
      root().querySelector('[data-testid="intervention-request-changes-error"]')?.textContent,
    ).toContain('This note is too vague.');
  });

  it('should fall back to a readable message when the API said nothing showable', async () => {
    fixture.componentRef.setInput('serverError', new Error('Http failure response'));
    await fixture.whenStable();

    expect(
      root().querySelector('[data-testid="intervention-request-changes-error"]')?.textContent,
    ).toContain('The intervention status could not be changed.');
  });

  it('should announce nothing before a failure', () => {
    expect(root().querySelector('[data-testid="intervention-request-changes-error"]')).toBeNull();
  });

  it('should list the cancel button before the submit button in the action row', () => {
    const footer = root().querySelector('hlm-sheet-footer') as HTMLElement;
    const buttons = Array.from(footer.querySelectorAll('button'));
    const cancelButton = root().querySelector(
      '[data-testid="intervention-request-changes-cancel"]',
    ) as HTMLButtonElement;

    expect(buttons[0]).toBe(cancelButton);
    expect(buttons[1]).toBe(submitButton());
  });

  it('should mark the note field aria-invalid once submission touches it empty', async () => {
    await submit();

    expect(note().getAttribute('aria-invalid')).toBe('true');
  });

  it('should swap the submit label to the pending wording while sending', async () => {
    await type('Re-check the third floor.');
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();

    expect(root().textContent).toContain('Sending…');
  });

  it('should mark the note label required with an aria-hidden asterisk', () => {
    const label = root().querySelector(
      'label[for="intervention-request-changes-note"]',
    ) as HTMLLabelElement;
    const asterisk = label.querySelector('span[aria-hidden="true"]');

    expect(asterisk?.textContent).toContain('*');
  });
});
