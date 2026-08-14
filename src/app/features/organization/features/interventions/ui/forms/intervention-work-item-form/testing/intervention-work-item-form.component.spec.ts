import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { InterventionWorkItemForm } from '../intervention-work-item-form.component';
import type { InterventionWorkItemFormValues } from '../models';

describe('InterventionWorkItemForm', () => {
  let fixture: ComponentFixture<InterventionWorkItemForm>;
  let submissions: InterventionWorkItemFormValues[];
  let cancellations: void[];

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const form = (): HTMLFormElement => root().querySelector('form') as HTMLFormElement;
  const submitButton = (): HTMLButtonElement =>
    root().querySelector('[data-testid="intervention-work-item-submit"]') as HTMLButtonElement;
  const cancelButton = (): HTMLButtonElement =>
    root().querySelector('[data-testid="intervention-work-item-cancel"]') as HTMLButtonElement;
  const submit = async (): Promise<void> => {
    form().dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(InterventionWorkItemForm);
    await fixture.whenStable();

    submissions = [];
    cancellations = [];
    fixture.componentInstance.submitted.subscribe((values) => submissions.push(values));
    fixture.componentInstance.cancelled.subscribe(() => cancellations.push(undefined));
  });

  it('should emit the drafted item on a valid submit, with the optional fields trimmed', async () => {
    await submit();

    expect(submissions).toEqual([{ action: 'inventory', target: '', assignee: '' }]);
  });

  it('should not submit while the creation request is in flight', async () => {
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();

    await submit();

    expect(submissions).toEqual([]);
    expect(submitButton().disabled).toBe(true);
  });

  it('should not submit once the prepared scope may no longer grow', async () => {
    fixture.componentRef.setInput('disabled', true);
    await fixture.whenStable();

    await submit();

    expect(submissions).toEqual([]);
    expect(submitButton().disabled).toBe(true);
  });

  it('should let the planner back out without a payload', () => {
    cancelButton().click();

    expect(cancellations.length).toBe(1);
    expect(submissions).toEqual([]);
  });

  it('should surface what the API said about a rejected creation', async () => {
    fixture.componentRef.setInput('serverError', {
      status: 422,
      violations: [{ propertyPath: 'action', message: 'This action is not recognized.' }],
    });
    await fixture.whenStable();

    expect(
      root().querySelector('[data-testid="intervention-work-item-error"]')?.textContent,
    ).toContain('This action is not recognized.');
  });

  it('should fall back to a readable message when the API said nothing showable', async () => {
    fixture.componentRef.setInput('serverError', new Error('boom'));
    await fixture.whenStable();

    expect(
      root().querySelector('[data-testid="intervention-work-item-error"]')?.textContent,
    ).toContain('The work item could not be created.');
  });

  it('should announce nothing before a failure', () => {
    expect(root().querySelector('[data-testid="intervention-work-item-error"]')).toBeNull();
  });

  it('should list the cancel button before the submit button in the action row', () => {
    const footer = root().querySelector('hlm-sheet-footer') as HTMLElement;
    const buttons = Array.from(footer.querySelectorAll('button'));

    expect(buttons[0]).toBe(cancelButton());
    expect(buttons[1]).toBe(submitButton());
  });

  it('should swap the submit label to the pending wording while creating', async () => {
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();

    expect(root().textContent).toContain('Adding…');
  });

  it('should mark the action label required with an aria-hidden asterisk', () => {
    const label = root().querySelector(
      'label[for="intervention-work-item-action"]',
    ) as HTMLLabelElement;
    const asterisk = label.querySelector('span[aria-hidden="true"]');

    expect(asterisk?.textContent).toContain('*');
  });
});
