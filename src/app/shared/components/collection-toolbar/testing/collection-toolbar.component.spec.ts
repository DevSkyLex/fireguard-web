import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { CollectionToolbar } from '../collection-toolbar.component';

@Component({
  imports: [CollectionToolbar],
  template: `
    <app-collection-toolbar [count]="'11 interventions'" [showFilters]="true">
      <span toolbarLead data-testid="lead-stub">view switch</span>
      <button type="button" data-testid="action-stub">New</button>
    </app-collection-toolbar>
  `,
})
class HostComponent {}

describe('CollectionToolbar', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [CollectionToolbar, HostComponent] });
  });

  const create = (inputs: Record<string, unknown> = {}) => {
    const fixture = TestBed.createComponent(CollectionToolbar);
    for (const [key, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(key, value);
    }
    fixture.detectChanges();
    return fixture;
  };

  it('should render the formatted count', () => {
    const fixture = create({ count: '11 interventions' });

    expect(
      fixture.debugElement.query(By.css('[data-testid="collection-toolbar-count"]')).nativeElement
        .textContent,
    ).toContain('11 interventions');
  });

  it('should omit the count label when empty', () => {
    expect(
      create({ count: '' }).debugElement.query(By.css('[data-testid="collection-toolbar-count"]')),
    ).toBeNull();
  });

  it('should emit every keystroke and leave debouncing to the page', () => {
    const fixture = create({ searchPlaceholder: 'Search interventions' });
    const emitted: string[] = [];
    fixture.componentInstance.searchChanged.subscribe((value: string) => emitted.push(value));

    const input = fixture.debugElement.query(
      By.css('[data-testid="collection-toolbar-search"]'),
    ).nativeElement;
    input.value = 'ex';
    input.dispatchEvent(new Event('input'));
    input.value = 'ext';
    input.dispatchEvent(new Event('input'));

    expect(emitted).toEqual(['ex', 'ext']);
  });

  // A placeholder is not an accessible name: it vanishes as soon as you type.
  it('should fall back to the placeholder for the accessible name', () => {
    const fixture = create({ searchPlaceholder: 'Search interventions' });

    expect(
      fixture.debugElement
        .query(By.css('[data-testid="collection-toolbar-search"]'))
        .nativeElement.getAttribute('aria-label'),
    ).toBe('Search interventions');
  });

  it('should hide the filters button unless asked, and badge it when filters are active', () => {
    expect(
      create().debugElement.query(By.css('[data-testid="collection-toolbar-filters"]')),
    ).toBeNull();

    const fixture = create({ showFilters: true, activeFilterCount: 2 });
    const button = fixture.debugElement.query(By.css('[data-testid="collection-toolbar-filters"]'));

    expect(button).toBeTruthy();
    expect(button.nativeElement.textContent).toContain('2');
  });

  it('should emit when the filters button is activated', () => {
    const fixture = create({ showFilters: true });
    let opened = 0;
    fixture.componentInstance.filtersOpened.subscribe(() => (opened += 1));

    fixture.debugElement
      .query(By.css('[data-testid="collection-toolbar-filters"] button'))
      .nativeElement.click();

    expect(opened).toBe(1);
  });

  it('should project both the leading controls and the trailing actions', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('[data-testid="lead-stub"]'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('[data-testid="action-stub"]'))).toBeTruthy();
  });
});
