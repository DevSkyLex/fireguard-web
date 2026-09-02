import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { CreateChecklistInput } from '@features/organization/features/checklists/models';
import { ChecklistCreateSheet } from '../checklist-create-sheet.component';

describe('ChecklistCreateSheet', () => {
  let fixture: ComponentFixture<ChecklistCreateSheet>;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(ChecklistCreateSheet);
  });

  it('should render nothing to the portal while closed', async () => {
    fixture.componentRef.setInput('visible', false);
    await fixture.whenStable();

    expect(document.querySelector('[data-testid="checklist-create-sheet"]')).toBeNull();
  });

  it('should render the create form inside the sheet once open', async () => {
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();

    expect(document.querySelector('app-checklist-create-form')).not.toBeNull();
  });

  it('should forward the form submission untouched', async () => {
    const emitted: CreateChecklistInput[] = [];
    fixture.componentInstance.submitted.subscribe((value: CreateChecklistInput): void => {
      emitted.push(value);
    });

    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();

    const payload: CreateChecklistInput = { name: 'Fire Safety', version: '1.0', items: [] };
    fixture.componentInstance.submitted.emit(payload);

    expect(emitted).toEqual([payload]);
  });

  it('should close right away on cancel while nothing was typed', () => {
    const visibleChange = vi.fn();
    fixture.componentInstance.visibleChange.subscribe(visibleChange);

    fixture.componentInstance['requestClose']();

    expect(visibleChange).toHaveBeenCalledWith(false);
  });

  it('should ask before discarding a dirty draft, and close only once confirmed', () => {
    const visibleChange = vi.fn();
    fixture.componentInstance.visibleChange.subscribe(visibleChange);
    fixture.componentInstance['dirty'].set(true);

    fixture.componentInstance['requestClose']();
    expect(fixture.componentInstance['unsavedChangesDialogState']()).toBe('open');
    expect(visibleChange).not.toHaveBeenCalled();

    fixture.componentInstance['onUnsavedChangesDismissed']();
    expect(fixture.componentInstance['unsavedChangesDialogState']()).toBe('closed');
    expect(visibleChange).not.toHaveBeenCalled();

    fixture.componentInstance['requestClose']();
    fixture.componentInstance['onUnsavedChangesConfirmed']();
    expect(visibleChange).toHaveBeenCalledWith(false);
  });

  it('should treat an Escape on a dirty draft as a close request, not a close', async () => {
    const visibleChange = vi.fn();
    fixture.componentInstance.visibleChange.subscribe(visibleChange);
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();
    fixture.componentInstance['dirty'].set(true);

    fixture.componentInstance['onStateChanged']('closed');

    expect(fixture.componentInstance['unsavedChangesDialogState']()).toBe('open');
    expect(visibleChange).not.toHaveBeenCalled();
  });

  it('should forget the dirty flag once the panel closes', async () => {
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();
    fixture.componentInstance['dirty'].set(true);

    fixture.componentRef.setInput('visible', false);
    await fixture.whenStable();

    expect(fixture.componentInstance['dirty']()).toBe(false);
  });
});
