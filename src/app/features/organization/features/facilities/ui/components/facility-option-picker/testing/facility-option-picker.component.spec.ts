import { TestBed } from '@angular/core/testing';
import { FacilityOptionPicker } from '../facility-option-picker.component';

describe('FacilityOptionPicker', () => {
  it('retains the chosen label outside the current page and clears it when selection changes', async () => {
    const fixture = TestBed.createComponent(FacilityOptionPicker);
    const selectionChanged = vi.fn();
    fixture.componentInstance.selectedOptionChanged.subscribe(selectionChanged);
    fixture.componentRef.setInput('options', [
      {
        value: 'facility-201',
        label: 'Annex',
        type: 'site',
        typeLabel: 'Site',
        pathLabel: null,
        address: null,
      },
    ]);
    fixture.componentRef.setInput('value', 'facility-201');
    await fixture.whenStable();
    fixture.componentRef.setInput('options', []);
    await fixture.whenStable();
    expect(fixture.componentInstance['labelOf']('facility-201')).toBe('Annex');
    expect(fixture.componentInstance.value()).toBe('facility-201');
    expect(selectionChanged).toHaveBeenLastCalledWith(
      expect.objectContaining({ value: 'facility-201', type: 'site' }),
    );
    fixture.componentRef.setInput('value', 'other');
    await fixture.whenStable();
    expect(fixture.componentInstance['labelOf']('other')).toBe('Unknown facility');
    expect(selectionChanged).toHaveBeenLastCalledWith(null);
  });

  it('requests the next server page without replacing the selected identity', async () => {
    const fixture = TestBed.createComponent(FacilityOptionPicker);
    fixture.componentRef.setInput('pageCount', 2);
    fixture.componentRef.setInput('value', 'chosen');
    await fixture.whenStable();
    const counter = (fixture.nativeElement as HTMLElement).querySelector('output');
    expect(counter?.getAttribute('aria-live')).toBe('polite');
    expect(counter?.textContent?.trim()).toBe('1 / 2');
    expect(counter?.tabIndex).toBe(-1);
    const requested = vi.fn();
    fixture.componentInstance.pageChanged.subscribe(requested);
    const next = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find(
      (button) => button.textContent?.includes('Next'),
    );
    next?.click();
    expect(requested).toHaveBeenCalledWith(2);
    expect(fixture.componentInstance.value()).toBe('chosen');
    fixture.componentRef.setInput('page', 2);
    await fixture.whenStable();
    expect(counter?.textContent?.trim()).toBe('2 / 2');
  });
});
