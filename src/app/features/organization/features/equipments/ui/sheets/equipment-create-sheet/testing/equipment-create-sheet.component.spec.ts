import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { EquipmentCreateSheet } from '../equipment-create-sheet.component';

describe('EquipmentCreateSheet', () => {
  let fixture: ComponentFixture<EquipmentCreateSheet>;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(EquipmentCreateSheet);
    await fixture.whenStable();
  });

  it('should stay closed until the page opens it', async () => {
    expect(document.querySelector('[data-testid="equipment-create-sheet"]')).toBeNull();

    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();

    expect(document.querySelector('[data-testid="equipment-create-sheet"]')).not.toBeNull();
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

  it('should treat an Escape on a dirty draft as a close request, not a close', () => {
    const visibleChange = vi.fn();
    fixture.componentInstance.visibleChange.subscribe(visibleChange);
    fixture.componentRef.setInput('visible', true);
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
