import { Component, provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { FilterChip } from '../filter-chip.component';

@Component({
  selector: 'app-filter-chip-host',
  imports: [FilterChip],
  template: `
    <app-filter-chip
      fieldLabel="Status"
      icon="lucideX"
      removeLabel="Remove filter: Status"
      (removed)="removedCount = removedCount + 1"
    >
      <button type="button" data-testid="value-slot">Planned</button>
    </app-filter-chip>
  `,
})
class FilterChipHost {
  public removedCount = 0;
}

describe('FilterChip', () => {
  let fixture: ComponentFixture<FilterChipHost>;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(FilterChipHost);
    await fixture.whenStable();
  });

  it('should render the field label and the projected value control', () => {
    const element: HTMLElement = fixture.nativeElement as HTMLElement;

    expect(element.textContent).toContain('Status');
    expect(element.querySelector('[data-testid="value-slot"]')?.textContent).toContain('Planned');
  });

  it('should name the remove button by the caller-supplied removeLabel, distinct per instance', () => {
    const removeButton: HTMLElement | null = (fixture.nativeElement as HTMLElement).querySelector(
      '[data-testid="interventions-filter-chip-remove"]',
    );

    expect(removeButton?.getAttribute('aria-label')).toBe('Remove filter: Status');
  });

  it('should emit removed when the remove button is activated, without owning any filter state', async () => {
    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('[data-testid="interventions-filter-chip-remove"]')
      ?.click();
    await fixture.whenStable();

    expect(fixture.componentInstance.removedCount).toBe(1);
  });
});
