import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import {
  InterventionWorkItemForm,
  type InterventionWorkItemFormValues,
} from '../../../forms/intervention-work-item-form';
import { InterventionWorkItemSheet } from '../intervention-work-item-sheet.component';

const content = (): HTMLElement =>
  document.querySelector('[data-testid="intervention-work-item-sheet"]') as HTMLElement;
const inSheet = (selector: string): HTMLElement => content().querySelector(selector) as HTMLElement;

const unsavedChangesDialog = (): HTMLElement | null =>
  document.querySelector('[data-testid="unsaved-changes-dialog"]');

const pressEscape = (): void => {
  content()?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
};

describe('InterventionWorkItemSheet', () => {
  let fixture: ComponentFixture<InterventionWorkItemSheet>;
  let visibility: boolean[];
  let submissions: InterventionWorkItemFormValues[];

  const dirtyTheForm = (): void => {
    fixture.debugElement
      .query(By.directive(InterventionWorkItemForm))
      .componentInstance.dirtyChanged.emit(true);
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(InterventionWorkItemSheet);
    await fixture.whenStable();

    visibility = [];
    submissions = [];
    fixture.componentInstance.visibleChange.subscribe((value) => visibility.push(value));
    fixture.componentInstance.submitted.subscribe((values) => submissions.push(values));
  });

  it('should stay closed until the page opens it', () => {
    expect(content()).toBeNull();
  });

  it('should open when the page says so', async () => {
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();

    expect(content()).not.toBeNull();
    expect(content().textContent).toContain('Add work item');
  });

  it('should relay the form cancellation as a close request', async () => {
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();

    (inSheet('[data-testid="intervention-work-item-cancel"]') as HTMLButtonElement).click();

    expect(visibility).toEqual([false]);
  });

  it('should forward the item the form validated', async () => {
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();

    (inSheet('form') as HTMLFormElement).dispatchEvent(new Event('submit'));

    expect(submissions).toEqual([{ action: 'inventory', target: '', assignee: '' }]);
  });

  it('should forward the target and member options down to the form', async () => {
    fixture.componentRef.setInput('visible', true);
    fixture.componentRef.setInput('targetOptions', [
      { value: '/api/equipment/eq-1', label: 'Extinguisher A-12' },
    ]);
    await fixture.whenStable();

    expect(content().textContent).toContain('Add work item');
  });

  it('should close through Escape when nothing is dirty', async () => {
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();

    pressEscape();
    await fixture.whenStable();

    expect(visibility).toEqual([false]);
  });

  it('should close directly through its own close button when nothing is dirty', async () => {
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();

    (inSheet('[data-testid="intervention-work-item-sheet-close"]') as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(visibility).toEqual([false]);
    expect(unsavedChangesDialog()).toBeNull();
  });

  it('should refuse to close while the creation request is in flight', async () => {
    fixture.componentRef.setInput('visible', true);
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();

    content().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await fixture.whenStable();

    expect(visibility).toEqual([]);
    expect(content()).not.toBeNull();
  });

  it('should keep the submit control locked while the creation request is in flight', async () => {
    fixture.componentRef.setInput('visible', true);
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();

    expect(
      (inSheet('[data-testid="intervention-work-item-submit"]') as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it('should confirm before an Escape throws away a started item', async () => {
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();

    dirtyTheForm();
    await fixture.whenStable();

    pressEscape();
    await fixture.whenStable();

    expect(visibility).toEqual([]);
    expect(unsavedChangesDialog()).not.toBeNull();
    expect(content()).not.toBeNull();
  });

  it('should confirm before Cancel throws away a started item', async () => {
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();

    dirtyTheForm();
    await fixture.whenStable();

    (inSheet('[data-testid="intervention-work-item-cancel"]') as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(visibility).toEqual([]);
    expect(unsavedChangesDialog()).not.toBeNull();
  });

  it('should close once the planner confirms the discard', async () => {
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();

    dirtyTheForm();
    await fixture.whenStable();

    fixture.componentInstance['requestClose']();
    fixture.componentInstance['onUnsavedChangesConfirmed']();
    await fixture.whenStable();

    expect(visibility).toEqual([false]);
    expect(fixture.componentInstance['unsavedChangesDialogState']()).toBe('closed');
  });

  it('should forget a stale draft once the panel has closed', async () => {
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();

    dirtyTheForm();
    await fixture.whenStable();

    fixture.componentRef.setInput('visible', false);
    await fixture.whenStable();

    expect(fixture.componentInstance['dirty']()).toBe(false);
  });
});
