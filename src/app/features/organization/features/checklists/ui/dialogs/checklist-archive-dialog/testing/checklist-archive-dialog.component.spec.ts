import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { ChecklistArchiveDialog } from '../checklist-archive-dialog.component';

describe('ChecklistArchiveDialog', () => {
  let fixture: ComponentFixture<ChecklistArchiveDialog>;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(ChecklistArchiveDialog);
    fixture.componentRef.setInput('visible', true);
    fixture.componentRef.setInput('checklistName', 'Fire Safety Inspection');
  });

  it('should name the checklist in the confirmation copy', async () => {
    await fixture.whenStable();

    const content: Element | null = document.querySelector(
      '[data-testid="checklist-archive-dialog"]',
    );

    expect(content?.textContent).toContain('Fire Safety Inspection');
  });

  it('should emit confirmed when the archive action is chosen', async () => {
    const emitted: void[] = [];
    fixture.componentInstance.confirmed.subscribe((): void => {
      emitted.push(undefined);
    });
    await fixture.whenStable();

    document.querySelector<HTMLButtonElement>('[data-testid="checklist-archive-confirm"]')?.click();

    expect(emitted.length).toBe(1);
  });

  it('should not confirm while a previous archive is still in flight', async () => {
    fixture.componentRef.setInput('pending', true);
    const emitted: void[] = [];
    fixture.componentInstance.confirmed.subscribe((): void => {
      emitted.push(undefined);
    });
    await fixture.whenStable();

    document.querySelector<HTMLButtonElement>('[data-testid="checklist-archive-confirm"]')?.click();

    expect(emitted).toEqual([]);
  });
});
