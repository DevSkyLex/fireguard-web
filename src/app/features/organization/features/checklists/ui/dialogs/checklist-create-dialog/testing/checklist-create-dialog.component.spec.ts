import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { CreateChecklistInput } from '@features/organization/features/checklists/models';
import { ChecklistCreateDialog } from '../checklist-create-dialog.component';

describe('ChecklistCreateDialog', () => {
  let fixture: ComponentFixture<ChecklistCreateDialog>;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(ChecklistCreateDialog);
  });

  it('should render nothing to the portal while closed', async () => {
    fixture.componentRef.setInput('visible', false);
    await fixture.whenStable();

    expect(document.querySelector('[data-testid="checklist-create-dialog"]')).toBeNull();
  });

  it('should render the create form inside the dialog once open', async () => {
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
});
