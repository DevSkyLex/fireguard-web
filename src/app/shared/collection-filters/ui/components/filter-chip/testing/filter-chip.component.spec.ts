import {
  Component,
  provideZonelessChangeDetection,
  signal,
  type WritableSignal,
} from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { CollectionFilterOperator } from '../../../../models';
import { FilterChip } from '../filter-chip.component';

@Component({
  selector: 'app-filter-chip-host',
  imports: [FilterChip],
  template: `
    <app-filter-chip
      fieldLabel="Status"
      icon="lucideX"
      removeLabel="Remove filter: Status"
      testIdPrefix="interventions"
      [operator]="operator()"
      [operatorOptions]="operatorOptions()"
      changeOperatorLabel="Change operator: Status"
      (removed)="removedCount = removedCount + 1"
      (operatorChanged)="lastOperatorChange = $event"
    >
      <button type="button" data-testid="value-slot">Planned</button>
    </app-filter-chip>
  `,
})
class FilterChipHost {
  public removedCount = 0;
  public lastOperatorChange: CollectionFilterOperator | null = null;
  public readonly operator: WritableSignal<CollectionFilterOperator> =
    signal<CollectionFilterOperator>('equals');
  public readonly operatorOptions: WritableSignal<readonly CollectionFilterOperator[]> = signal<
    readonly CollectionFilterOperator[]
  >(['equals']);
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

  it('renders a single-operator field as a fixed, non-interactive label', () => {
    const element: HTMLElement = fixture.nativeElement as HTMLElement;
    const operatorSegment: HTMLElement | null = element.querySelector(
      '[data-testid="interventions-filter-chip-operator"]',
    );

    expect(operatorSegment?.tagName).toBe('SPAN');
    expect(operatorSegment?.textContent?.trim()).toBe('is');
  });

  it('renders a multi-operator field as a select offering every declared operator', async () => {
    fixture.componentInstance.operatorOptions.set(['equals', 'contains']);
    await fixture.whenStable();

    const element: HTMLElement = fixture.nativeElement as HTMLElement;
    const operatorSegment: HTMLElement | null = element.querySelector(
      '[data-testid="interventions-filter-chip-operator"]',
    );

    expect(operatorSegment?.querySelector('button')).not.toBeNull();
    expect(operatorSegment?.textContent?.trim()).toBe('is');
  });
});
