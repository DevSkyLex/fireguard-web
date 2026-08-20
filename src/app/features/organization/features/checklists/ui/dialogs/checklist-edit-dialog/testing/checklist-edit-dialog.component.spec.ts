import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { ChecklistEditDialog } from '../checklist-edit-dialog.component';

describe('ChecklistEditDialog', () => {
  let fixture: ComponentFixture<ChecklistEditDialog>;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(ChecklistEditDialog);
  });

  it('should render nothing to the portal while closed', async () => {
    fixture.componentRef.setInput('visible', false);
    await fixture.whenStable();

    expect(document.querySelector('[data-testid="checklist-edit-dialog"]')).toBeNull();
  });

  it('should render the edit form inside the dialog once open', async () => {
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();

    expect(document.querySelector('app-checklist-edit-form')).not.toBeNull();
  });

  it('should report a dismissal back to the page', async () => {
    const emitted: boolean[] = [];
    fixture.componentInstance.visibleChange.subscribe((value: boolean): void => {
      emitted.push(value);
    });

    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();

    document.querySelector<HTMLButtonElement>('[data-testid="checklist-edit-cancel"]')?.click();

    expect(emitted).toEqual([false]);
  });
});
