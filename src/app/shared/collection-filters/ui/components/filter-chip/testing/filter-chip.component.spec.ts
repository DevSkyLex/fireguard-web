import {
  Component,
  provideZonelessChangeDetection,
  signal,
  viewChild,
  type Signal,
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
      operatorTriggerId="interventions-filter-chip-operator-status"
      [disabled]="disabled()"
      [unavailableReason]="unavailableReason()"
      reasonId="interventions-filter-reason-status"
      (removed)="removedCount = removedCount + 1"
      (operatorChanged)="lastOperatorChange = $event"
    >
      <button type="button" data-testid="value-slot">Planned</button>
    </app-filter-chip>
  `,
})
class FilterChipHost {
  public removedCount: number = 0;
  public lastOperatorChange: CollectionFilterOperator | null = null;
  public readonly operator: WritableSignal<CollectionFilterOperator> =
    signal<CollectionFilterOperator>('equals');
  public readonly operatorOptions: WritableSignal<readonly CollectionFilterOperator[]> = signal<
    readonly CollectionFilterOperator[]
  >(['equals']);
  public readonly disabled: WritableSignal<boolean> = signal<boolean>(false);
  public readonly unavailableReason: WritableSignal<string> = signal<string>('');
  public readonly chip: Signal<FilterChip> = viewChild.required(FilterChip);
}

/** Minimal ResizeObserver stand-in: the operator select's popover observes its anchor, and the test environment provides no implementation. */
class ResizeObserverStub {
  public observe(): void {}
  public unobserve(): void {}
  public disconnect(): void {}
}

describe('FilterChip', () => {
  let fixture: ComponentFixture<FilterChipHost>;

  beforeAll(() => {
    globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;
    HTMLElement.prototype.scrollIntoView ??= (): void => {};
  });

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

  it('should render a single-operator field as a fixed, non-interactive label', () => {
    const element: HTMLElement = fixture.nativeElement as HTMLElement;
    const operatorSegment: HTMLElement | null = element.querySelector(
      '[data-testid="interventions-filter-chip-operator"]',
    );

    expect(operatorSegment?.tagName).toBe('SPAN');
    expect(operatorSegment?.textContent?.trim()).toBe('is');
  });

  it('should render a multi-operator field as a select offering every declared operator', async () => {
    fixture.componentInstance.operatorOptions.set(['equals', 'contains']);
    await fixture.whenStable();

    const element: HTMLElement = fixture.nativeElement as HTMLElement;
    const operatorSegment: HTMLElement | null = element.querySelector(
      '[data-testid="interventions-filter-chip-operator"]',
    );

    expect(operatorSegment?.querySelector('button')).not.toBeNull();
    expect(operatorSegment?.textContent?.trim()).toBe('is');
  });

  it('should emit operatorChanged with the operator picked from the select', async () => {
    fixture.componentInstance.operatorOptions.set(['equals', 'contains']);
    await fixture.whenStable();

    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('[data-testid="interventions-filter-chip-operator"] button')
      ?.click();
    await fixture.whenStable();

    Array.from(document.querySelectorAll<HTMLElement>('[role="option"]'))
      .find((option: HTMLElement): boolean => option.textContent?.trim() === 'contains')
      ?.click();
    await fixture.whenStable();

    expect(fixture.componentInstance.lastOperatorChange).toBe('contains');
  });

  it('should keep the operator select and remove button focusable, aria-disabled, and inert while disabled', async () => {
    fixture.componentInstance.disabled.set(true);
    fixture.componentInstance.operatorOptions.set(['equals', 'contains']);
    await fixture.whenStable();

    const element: HTMLElement = fixture.nativeElement as HTMLElement;
    const operatorSegment: HTMLElement | null = element.querySelector(
      '[data-testid="interventions-filter-chip-operator"]',
    );
    const operatorTrigger: HTMLButtonElement | null | undefined =
      operatorSegment?.querySelector('button');

    expect(operatorTrigger?.disabled).toBeFalsy();
    expect(operatorSegment?.getAttribute('aria-disabled')).toBe('true');
    expect(operatorTrigger?.getAttribute('aria-disabled')).toBe('true');

    operatorTrigger?.click();
    await fixture.whenStable();
    document.querySelector<HTMLElement>('[role="option"]')?.click();
    await fixture.whenStable();

    expect(fixture.componentInstance.lastOperatorChange).toBeNull();
  });

  it('should keep the remove button live while disabled, so an inapplicable narrowing stays dismissible', async () => {
    fixture.componentInstance.disabled.set(true);
    await fixture.whenStable();

    const removeButton: HTMLButtonElement | null = (
      fixture.nativeElement as HTMLElement
    ).querySelector('[data-testid="interventions-filter-chip-remove"]');

    expect(removeButton?.disabled).toBeFalsy();
    expect(removeButton?.getAttribute('aria-disabled')).toBeNull();

    removeButton?.click();
    await fixture.whenStable();

    expect(fixture.componentInstance.removedCount).toBe(1);
  });

  it("should render the caller-supplied operatorTriggerId on the select trigger and its label's for, once the field offers a choice", async () => {
    fixture.componentInstance.operatorOptions.set(['equals', 'contains']);
    await fixture.whenStable();

    const element: HTMLElement = fixture.nativeElement as HTMLElement;
    const label: HTMLLabelElement | null = element.querySelector('label.sr-only');
    const trigger: HTMLElement | null = element.querySelector(
      '[data-testid="interventions-filter-chip-operator"] button',
    );

    expect(label?.getAttribute('for')).toBe('interventions-filter-chip-operator-status');
    expect(trigger?.id).toBe('interventions-filter-chip-operator-status');
  });

  it('should render no reason row while unavailableReason is empty', () => {
    const element: HTMLElement = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('[data-testid="interventions-filter-chip-reason"]')).toBeNull();
  });

  it('should render the full unavailableReason as its own trailing row rather than truncating it', async () => {
    const reason =
      'Ignored here — the type filter is already used to narrow by status on this view.';
    fixture.componentInstance.unavailableReason.set(reason);
    await fixture.whenStable();

    const reasonElement: HTMLElement | null = (fixture.nativeElement as HTMLElement).querySelector(
      '[data-testid="interventions-filter-chip-reason"]',
    );

    expect(reasonElement?.textContent?.trim()).toBe(reason);
    expect(reasonElement?.className).not.toContain('truncate');
  });

  it('should describe the operator select and the remove button through aria-describedby once a reason is set', async () => {
    fixture.componentInstance.disabled.set(true);
    fixture.componentInstance.operatorOptions.set(['equals', 'contains']);
    fixture.componentInstance.unavailableReason.set('Status cannot be filtered on this view.');
    await fixture.whenStable();

    const element: HTMLElement = fixture.nativeElement as HTMLElement;
    const operatorTrigger: HTMLButtonElement | null = element.querySelector(
      '[data-testid="interventions-filter-chip-operator"] button',
    );
    const removeButton: HTMLButtonElement | null = element.querySelector(
      '[data-testid="interventions-filter-chip-remove"]',
    );
    const reasonElement: HTMLElement | null = element.querySelector(
      '[data-testid="interventions-filter-chip-reason"]',
    );

    expect(operatorTrigger?.getAttribute('aria-describedby')).toBe(
      'interventions-filter-reason-status',
    );
    expect(removeButton?.getAttribute('aria-describedby')).toBe(
      'interventions-filter-reason-status',
    );
    expect(reasonElement?.id).toBe('interventions-filter-reason-status');
    expect(reasonElement?.textContent).toContain('Status cannot be filtered on this view.');
  });

  it('should carry no aria-describedby while unavailableReason is empty, even if disabled', async () => {
    fixture.componentInstance.disabled.set(true);
    fixture.componentInstance.operatorOptions.set(['equals', 'contains']);
    await fixture.whenStable();

    const element: HTMLElement = fixture.nativeElement as HTMLElement;
    const operatorTrigger: HTMLButtonElement | null = element.querySelector(
      '[data-testid="interventions-filter-chip-operator"] button',
    );
    const removeButton: HTMLButtonElement | null = element.querySelector(
      '[data-testid="interventions-filter-chip-remove"]',
    );

    expect(operatorTrigger?.getAttribute('aria-describedby')).toBeNull();
    expect(removeButton?.getAttribute('aria-describedby')).toBeNull();
  });

  it('should expose focusRemove, which moves real DOM focus to its own remove button', () => {
    fixture.componentInstance.chip().focusRemove();

    const removeButton: HTMLElement | null = (fixture.nativeElement as HTMLElement).querySelector(
      '[data-testid="interventions-filter-chip-remove"]',
    );

    expect(document.activeElement).toBe(removeButton);
  });
});
