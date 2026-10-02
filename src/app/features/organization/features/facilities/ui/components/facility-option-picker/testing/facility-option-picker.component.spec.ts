import { TestBed } from '@angular/core/testing';
import { FacilityOptionPicker } from '../facility-option-picker.component';

describe('FacilityOptionPicker', () => {
  it('retains the chosen label outside the current page and clears it when selection changes', async () => {
    const fixture = TestBed.createComponent(FacilityOptionPicker);
    fixture.componentRef.setInput('options', [
      { value: 'facility-201', label: 'Annex', typeLabel: 'Site', pathLabel: null, address: null },
    ]);
    fixture.componentRef.setInput('value', 'facility-201');
    await fixture.whenStable();
    fixture.componentRef.setInput('options', []);
    await fixture.whenStable();
    expect(fixture.componentInstance['labelOf']('facility-201')).toBe('Annex');
    expect(fixture.componentInstance.value()).toBe('facility-201');
    fixture.componentRef.setInput('value', 'other');
    await fixture.whenStable();
    expect(fixture.componentInstance['labelOf']('other')).toBe('Unknown facility');
  });

  it('requests the next server page without replacing the selected identity', async () => {
    const fixture = TestBed.createComponent(FacilityOptionPicker);
    fixture.componentRef.setInput('pageCount', 2);
    fixture.componentRef.setInput('value', 'chosen');
    await fixture.whenStable();
    const requested = vi.fn();
    fixture.componentInstance.pageChanged.subscribe(requested);
    const next = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find(
      (button) => button.textContent?.includes('Next'),
    );
    next?.click();
    expect(requested).toHaveBeenCalledWith(2);
    expect(fixture.componentInstance.value()).toBe('chosen');
  });
});
