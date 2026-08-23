import {
  Component,
  provideZonelessChangeDetection,
  signal,
  type WritableSignal,
} from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { CollectionFilterOption } from '../../../../models';
import { CollectionFilterMultiSelect } from '../collection-filter-multi-select.component';

const OPTIONS: readonly CollectionFilterOption[] = [
  { value: 'planned', label: 'Planned' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'published', label: 'Published' },
];

@Component({
  selector: 'app-collection-filter-multi-select-host',
  imports: [CollectionFilterMultiSelect],
  template: `
    <app-collection-filter-multi-select
      [options]="options"
      [values]="values()"
      placeholder="Status"
      searchPlaceholder="Search a status"
      emptyLabel="No status matches."
      accessibleName="Change filter: Status"
      triggerId="interventions-filter-status"
      testId="interventions-filter-status"
      [maxVisible]="maxVisible()"
      [disabled]="disabled()"
      (valuesChanged)="lastSelection = $event"
    />
  `,
})
class CollectionFilterMultiSelectHost {
  public readonly options: readonly CollectionFilterOption[] = OPTIONS;
  public lastSelection: readonly string[] | null = null;
  public readonly values: WritableSignal<readonly string[]> = signal<readonly string[]>([]);
  public readonly maxVisible: WritableSignal<number> = signal<number>(2);
  public readonly disabled: WritableSignal<boolean> = signal<boolean>(false);
}

describe('CollectionFilterMultiSelect', () => {
  let fixture: ComponentFixture<CollectionFilterMultiSelectHost>;

  const trigger = (): HTMLElement =>
    (fixture.nativeElement as HTMLElement).querySelector(
      '[data-testid="interventions-filter-status"]',
    ) as HTMLElement;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(CollectionFilterMultiSelectHost);
    await fixture.whenStable();
  });

  it('should read as the field label while nothing is selected', () => {
    expect(trigger().textContent).toContain('Status');
  });

  it('should name the trigger through a visually hidden label bound to its id', () => {
    const label: HTMLLabelElement | null = (fixture.nativeElement as HTMLElement).querySelector(
      'label[for="interventions-filter-status"]',
    );

    expect(label?.textContent).toContain('Change filter: Status');
    expect(label?.className).toContain('sr-only');
  });

  it('should render one chip per selected value, labelled from the option catalog', async () => {
    fixture.componentInstance.values.set(['planned', 'in_progress']);
    await fixture.whenStable();

    const chips: NodeListOf<HTMLElement> = trigger().querySelectorAll(
      '[data-testid="collection-filter-value"]',
    );

    expect(chips.length).toBe(2);
    expect(chips[0].textContent).toContain('Planned');
    expect(chips[1].textContent).toContain('In progress');
  });

  it('should collapse the values beyond maxVisible into a +N marker', async () => {
    fixture.componentInstance.values.set(['planned', 'in_progress', 'submitted', 'published']);
    await fixture.whenStable();

    expect(trigger().querySelectorAll('[data-testid="collection-filter-value"]').length).toBe(2);
    expect(trigger().textContent).toContain('+2');
  });

  it('should never collapse every value, even when maxVisible is zero', async () => {
    fixture.componentInstance.maxVisible.set(0);
    fixture.componentInstance.values.set(['planned', 'in_progress']);
    await fixture.whenStable();

    expect(trigger().querySelectorAll('[data-testid="collection-filter-value"]').length).toBe(1);
    expect(trigger().textContent).toContain('+1');
  });

  it('should fall back to the raw value when it is absent from the catalog', async () => {
    fixture.componentInstance.values.set(['archived']);
    await fixture.whenStable();

    expect(trigger().textContent).toContain('archived');
  });

  it('should disable the trigger when the surface cannot apply the field', async () => {
    fixture.componentInstance.disabled.set(true);
    await fixture.whenStable();

    const button: HTMLButtonElement | null = trigger().querySelector('button');

    expect(button?.disabled).toBe(true);
  });
});
