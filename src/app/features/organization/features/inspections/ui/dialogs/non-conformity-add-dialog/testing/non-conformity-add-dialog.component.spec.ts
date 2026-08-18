import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { StoreError } from '@core/request-state';
import type { AddNonConformityInput } from '@features/organization/features/inspections/models';
import { NonConformityAddDialog } from '../non-conformity-add-dialog.component';

const setValue = (testId: string, value: string): void => {
  const input: HTMLTextAreaElement = document.querySelector<HTMLTextAreaElement>(
    `[data-testid="${testId}"]`,
  ) as HTMLTextAreaElement;
  input.value = value;
  input.dispatchEvent(new Event('input'));
};

describe('NonConformityAddDialog', () => {
  let fixture: ComponentFixture<NonConformityAddDialog>;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(NonConformityAddDialog);
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();
  });

  it('should not submit and should show field errors when required fields are empty', async () => {
    const submitted: AddNonConformityInput[] = [];
    fixture.componentInstance.submitted.subscribe((value) => submitted.push(value));

    document
      .querySelector<HTMLFormElement>('[data-testid="non-conformity-add-dialog"] form')
      ?.requestSubmit();
    await fixture.whenStable();

    expect(submitted.length).toBe(0);
    expect(
      document.querySelector('[data-testid="non-conformity-add-dialog"]')?.textContent,
    ).toContain('Describe what was found.');
  });

  it('should emit submitted with the trimmed description and folded optional fields when valid', async () => {
    const submitted: AddNonConformityInput[] = [];
    fixture.componentInstance.submitted.subscribe((value) => submitted.push(value));

    setValue('non-conformity-add-description', '  Pressure gauge out of range  ');
    fixture.componentInstance['model'].update((draft) => ({ ...draft, severity: 'high' }));
    await fixture.whenStable();

    document
      .querySelector<HTMLFormElement>('[data-testid="non-conformity-add-dialog"] form')
      ?.requestSubmit();
    await fixture.whenStable();

    expect(submitted.length).toBe(1);
    expect(submitted[0].description).toBe('Pressure gauge out of range');
    expect(submitted[0].severity).toBe('high');
    expect(submitted[0].dueAt).toBeUndefined();
    expect(submitted[0].notes).toBeUndefined();
  });

  it('should render the server error inline', async () => {
    const error = { message: 'The inspection is closed.' } as StoreError;
    fixture.componentRef.setInput('serverError', error);
    await fixture.whenStable();

    expect(
      document.querySelector('[data-testid="non-conformity-add-error"]')?.textContent,
    ).toContain('The inspection is closed.');
  });

  it('should emit visibleChange false when Cancel is activated', () => {
    const changes: boolean[] = [];
    fixture.componentInstance.visibleChange.subscribe((visible: boolean): void => {
      changes.push(visible);
    });

    document.querySelector<HTMLButtonElement>('[data-testid="non-conformity-add-cancel"]')?.click();

    expect(changes).toEqual([false]);
  });

  it('should disable the submit button while pending', async () => {
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();

    expect(
      document.querySelector<HTMLButtonElement>('[data-testid="non-conformity-add-submit"]')
        ?.disabled,
    ).toBe(true);
  });

  it('should blank the draft when the dialog re-opens', async () => {
    setValue('non-conformity-add-description', 'Stale draft');
    await fixture.whenStable();

    fixture.componentRef.setInput('visible', false);
    await fixture.whenStable();
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();

    expect(
      document.querySelector<HTMLTextAreaElement>('[data-testid="non-conformity-add-description"]')
        ?.value,
    ).toBe('');
  });
});
