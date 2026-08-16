import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { CollectionFilterToggle } from '../collection-filter-toggle.component';

describe('CollectionFilterToggle', () => {
  let fixture: ComponentFixture<CollectionFilterToggle>;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(CollectionFilterToggle);
    fixture.componentRef.setInput('visible', false);
    fixture.componentRef.setInput('activeCount', 0);
    fixture.componentRef.setInput('label', 'Filters');
    fixture.componentRef.setInput('testIdPrefix', 'equipments');
    await fixture.whenStable();
  });

  function button(): HTMLButtonElement | null {
    return fixture.nativeElement.querySelector('button');
  }

  it('should build the data-testid from the given prefix', () => {
    expect(button()?.getAttribute('data-testid')).toBe('equipments-filters-toggle');
  });

  it('should point aria-controls at the filter bar id the same prefix builds', () => {
    expect(button()?.getAttribute('aria-controls')).toBe('equipments-filter-bar');
  });

  it('should reflect the collapsed state through aria-expanded and render no badge', () => {
    expect(button()?.getAttribute('aria-expanded')).toBe('false');
    expect(fixture.nativeElement.querySelector('hlm-badge')).toBeNull();
  });

  it('should reflect the expanded state through aria-expanded once visible', async () => {
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();

    expect(button()?.getAttribute('aria-expanded')).toBe('true');
  });

  it('should render the active filter count as a badge once at least one filter is active', async () => {
    fixture.componentRef.setInput('activeCount', 2);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('hlm-badge')?.textContent?.trim()).toBe('2');
  });

  it('should render the given label', () => {
    expect(button()?.textContent).toContain('Filters');
  });

  it('should emit visibleChange with the opposite of the current value when activated', async () => {
    const emitted: boolean[] = [];
    fixture.componentInstance.visibleChange.subscribe((value: boolean) => emitted.push(value));

    button()?.click();
    await fixture.whenStable();
    expect(emitted).toEqual([true]);

    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();
    button()?.click();
    await fixture.whenStable();

    expect(emitted).toEqual([true, false]);
  });
});
