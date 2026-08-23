import {
  Component,
  provideZonelessChangeDetection,
  signal,
  type WritableSignal,
} from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { CollectionFilterOption } from '../../../../models';
import { CollectionFilterSelect } from '../collection-filter-select.component';

const OPTIONS: readonly CollectionFilterOption[] = [
  { value: 'planned', label: 'Planned' },
  { value: 'in_progress', label: 'In progress' },
];

@Component({
  selector: 'app-collection-filter-select-host',
  imports: [CollectionFilterSelect],
  template: `
    <app-collection-filter-select
      [options]="options"
      [value]="value()"
      placeholder="Status"
      searchPlaceholder="Search a status"
      emptyLabel="No status matches."
      accessibleName="Change filter: Status"
      triggerId="interventions-filter-status"
      testId="interventions-filter-status"
      [disabled]="disabled()"
      (valueChanged)="lastValue = $event"
    />
  `,
})
class CollectionFilterSelectHost {
  public readonly options: readonly CollectionFilterOption[] = OPTIONS;
  public lastValue: string | null = null;
  public readonly value: WritableSignal<string | null> = signal<string | null>(null);
  public readonly disabled: WritableSignal<boolean> = signal<boolean>(false);
}

describe('CollectionFilterSelect', () => {
  let fixture: ComponentFixture<CollectionFilterSelectHost>;

  const trigger = (): HTMLElement =>
    (fixture.nativeElement as HTMLElement).querySelector(
      '[data-testid="interventions-filter-status"]',
    ) as HTMLElement;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(CollectionFilterSelectHost);
    await fixture.whenStable();
  });

  it('should read as the field label while no value is set', () => {
    expect(trigger().textContent).toContain('Status');
    expect(trigger().querySelectorAll('[data-testid="collection-filter-value"]').length).toBe(0);
  });

  it('should render the value as the same single filled chip its multi-value sibling uses', async () => {
    fixture.componentInstance.value.set('in_progress');
    await fixture.whenStable();

    const chips: NodeListOf<HTMLElement> = trigger().querySelectorAll(
      '[data-testid="collection-filter-value"]',
    );

    expect(chips.length).toBe(1);
    expect(chips[0].textContent).toContain('In progress');
  });

  it('should name the trigger through a visually hidden label bound to its id', () => {
    const label: HTMLLabelElement | null = (fixture.nativeElement as HTMLElement).querySelector(
      'label[for="interventions-filter-status"]',
    );

    expect(label?.textContent).toContain('Change filter: Status');
    expect(label?.className).toContain('sr-only');
  });

  it('should fall back to the raw value when it is absent from the catalog', async () => {
    fixture.componentInstance.value.set('archived');
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
