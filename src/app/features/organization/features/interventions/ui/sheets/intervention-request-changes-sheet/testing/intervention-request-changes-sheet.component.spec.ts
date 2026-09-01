import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { InterventionRequestChangesSheet } from '../intervention-request-changes-sheet.component';

const content = (): HTMLElement =>
  document.querySelector('[data-testid="intervention-request-changes-sheet"]') as HTMLElement;
const inSheet = (selector: string): HTMLElement => content().querySelector(selector) as HTMLElement;

const unsavedChangesDialog = (): HTMLElement | null =>
  document.querySelector('[data-testid="unsaved-changes-dialog"]');

const pressEscape = (): void => {
  content()?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
};

describe('InterventionRequestChangesSheet', () => {
  let fixture: ComponentFixture<InterventionRequestChangesSheet>;
  let visibility: boolean[];

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(InterventionRequestChangesSheet);
    await fixture.whenStable();

    visibility = [];
    fixture.componentInstance.visibleChange.subscribe((value) => visibility.push(value));
  });

  it('should stay closed until the page opens it', () => {
    expect(content()).toBeNull();
  });

  it('should open when the page says so', async () => {
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();

    expect(content()).not.toBeNull();
    expect(content().textContent).toContain('Request changes');
  });

  it('should explain the note in the panel header, where it is read before writing', async () => {
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();

    expect(content().textContent).toContain(
      'Explain what must change before this intervention can be published.',
    );
  });

  it('should not echo back the state the page just set', async () => {
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();

    expect(visibility).toEqual([]);
  });

  it('should relay the form cancellation as a close request', async () => {
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();

    (inSheet('[data-testid="intervention-request-changes-cancel"]') as HTMLButtonElement).click();

    expect(visibility).toEqual([false]);
  });

  it('should forward the note the form validated', async () => {
    const submissions: { note: string }[] = [];
    fixture.componentInstance.submitted.subscribe((values) => submissions.push(values));
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();

    const note: HTMLTextAreaElement = inSheet(
      '[data-testid="intervention-request-changes-note"]',
    ) as HTMLTextAreaElement;
    note.value = 'Re-check the third floor.';
    note.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    (inSheet('form') as HTMLFormElement).dispatchEvent(new Event('submit'));

    expect(submissions).toEqual([{ note: 'Re-check the third floor.' }]);
  });

  it('should close through Escape when nothing is dirty', async () => {
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();

    pressEscape();
    await fixture.whenStable();

    expect(visibility).toEqual([false]);
  });

  it('should refuse to close while the transition is in flight', async () => {
    fixture.componentRef.setInput('visible', true);
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();

    pressEscape();
    await fixture.whenStable();

    expect(visibility).toEqual([]);
    expect(content()).not.toBeNull();
  });

  it('should confirm before an Escape throws away a typed note', async () => {
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();

    const note: HTMLTextAreaElement = inSheet(
      '[data-testid="intervention-request-changes-note"]',
    ) as HTMLTextAreaElement;
    note.value = 'Re-check the third floor.';
    note.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    pressEscape();
    await fixture.whenStable();

    expect(visibility).toEqual([]);
    expect(unsavedChangesDialog()).not.toBeNull();
    expect(content()).not.toBeNull();
  });

  it('should confirm before Cancel throws away a typed note', async () => {
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();

    const note: HTMLTextAreaElement = inSheet(
      '[data-testid="intervention-request-changes-note"]',
    ) as HTMLTextAreaElement;
    note.value = 'Re-check the third floor.';
    note.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    (inSheet('[data-testid="intervention-request-changes-cancel"]') as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(visibility).toEqual([]);
    expect(unsavedChangesDialog()).not.toBeNull();
  });

  it('should close once the reviewer confirms the discard', async () => {
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();

    const note: HTMLTextAreaElement = inSheet(
      '[data-testid="intervention-request-changes-note"]',
    ) as HTMLTextAreaElement;
    note.value = 'Re-check the third floor.';
    note.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    fixture.componentInstance['requestClose']();
    fixture.componentInstance['onUnsavedChangesConfirmed']();
    await fixture.whenStable();

    expect(visibility).toEqual([false]);
    expect(fixture.componentInstance['unsavedChangesDialogState']()).toBe('closed');
  });

  it('should keep the note when the reviewer dismisses the confirmation', async () => {
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();

    const note: HTMLTextAreaElement = inSheet(
      '[data-testid="intervention-request-changes-note"]',
    ) as HTMLTextAreaElement;
    note.value = 'Re-check the third floor.';
    note.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    fixture.componentInstance['requestClose']();
    fixture.componentInstance['onUnsavedChangesDismissed']();
    await fixture.whenStable();

    expect(visibility).toEqual([]);
    expect(content()).not.toBeNull();
  });
});
