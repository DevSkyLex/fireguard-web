import {
  Component,
  computed,
  provideZonelessChangeDetection,
  signal,
  viewChild,
  type Signal,
  type TemplateRef,
  type WritableSignal,
} from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import type { CollectionFilterOption, CollectionFilterPopoverState } from '../../../../models';
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
      [searchPlaceholder]="searchPlaceholder()"
      emptyLabel="No status matches."
      accessibleName="Change filter: Status"
      triggerId="interventions-filter-status"
      testId="interventions-filter-status"
      [maxVisible]="maxVisible()"
      [state]="state()"
      [disabled]="disabled()"
      [tooltip]="tooltip()"
      [describedBy]="describedBy()"
      [optionTemplate]="optionTemplate()"
      [valueTemplate]="valueTemplate()"
      (valuesChanged)="lastSelection = $event"
      (stateChanged)="lastState = $event"
    />

    <ng-template #optionTpl let-option>
      <strong data-testid="option-template-body">{{ option.label }}</strong>
    </ng-template>
    <ng-template #valueTpl let-option>
      <strong data-testid="value-template-body">{{ option.label }}</strong>
    </ng-template>
  `,
})
class CollectionFilterMultiSelectHost {
  public readonly options: readonly CollectionFilterOption[] = OPTIONS;
  public lastSelection: readonly string[] | null = null;
  public lastState: CollectionFilterPopoverState | null = null;
  public readonly values: WritableSignal<readonly string[]> = signal<readonly string[]>([]);
  public readonly maxVisible: WritableSignal<number> = signal<number>(2);
  public readonly disabled: WritableSignal<boolean> = signal<boolean>(false);
  public readonly tooltip: WritableSignal<string> = signal<string>('');
  public readonly describedBy: WritableSignal<string | undefined> = signal<string | undefined>(
    undefined,
  );
  public readonly state: WritableSignal<CollectionFilterPopoverState> =
    signal<CollectionFilterPopoverState>('closed');
  public readonly searchPlaceholder: WritableSignal<string | undefined> = signal<
    string | undefined
  >('Search a status');
  public readonly useTemplates: WritableSignal<boolean> = signal<boolean>(false);

  private readonly optionTpl: Signal<TemplateRef<unknown> | undefined> =
    viewChild<TemplateRef<unknown>>('optionTpl');
  private readonly valueTpl: Signal<TemplateRef<unknown> | undefined> =
    viewChild<TemplateRef<unknown>>('valueTpl');

  public readonly optionTemplate: Signal<TemplateRef<unknown> | null> =
    computed<TemplateRef<unknown> | null>(() =>
      this.useTemplates() ? (this.optionTpl() ?? null) : null,
    );
  public readonly valueTemplate: Signal<TemplateRef<unknown> | null> =
    computed<TemplateRef<unknown> | null>(() =>
      this.useTemplates() ? (this.valueTpl() ?? null) : null,
    );
}

/** Minimal ResizeObserver stand-in: the popover observes its anchor, and the test environment provides no implementation. */
class ResizeObserverStub {
  public observe(): void {}
  public unobserve(): void {}
  public disconnect(): void {}
}

describe('CollectionFilterMultiSelect', () => {
  let fixture: ComponentFixture<CollectionFilterMultiSelectHost>;

  const trigger = (): HTMLElement =>
    (fixture.nativeElement as HTMLElement).querySelector(
      '[data-testid="interventions-filter-status"]',
    ) as HTMLElement;

  beforeAll(() => {
    globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;
    HTMLElement.prototype.scrollIntoView ??= (): void => {};
  });

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

  it('should name an unknown value instead of leaking the raw key', async () => {
    fixture.componentInstance.values.set(['archived']);
    await fixture.whenStable();

    expect(trigger().textContent).toContain('Unknown value');
    expect(trigger().textContent).not.toContain('archived');
  });

  it('should keep the trigger focusable and mark it aria-disabled while disabled', async () => {
    fixture.componentInstance.disabled.set(true);
    await fixture.whenStable();

    const button: HTMLButtonElement | null = trigger().querySelector('button');

    expect(button?.disabled).toBeFalsy();
    expect(trigger().getAttribute('aria-disabled')).toBe('true');
    expect(button?.getAttribute('aria-disabled')).toBe('true');
  });

  it('should render no visible or accessible trace of tooltip — CollectionFilterBar’s own chip owns the reason now', async () => {
    fixture.componentInstance.disabled.set(true);
    fixture.componentInstance.tooltip.set('Status cannot be filtered on this view.');
    await fixture.whenStable();

    const button: HTMLButtonElement | null = trigger().querySelector('button');

    expect(button?.getAttribute('aria-describedby')).toBeNull();
    expect(trigger().querySelector('[data-slot="field-description"]')).toBeNull();
    expect(trigger().textContent).not.toContain('Status cannot be filtered on this view.');
  });

  it('should carry no aria-describedby while describedBy is unset', () => {
    expect(trigger().querySelector('button')?.hasAttribute('aria-describedby')).toBe(false);
  });

  it('should carry the given reason row id as its aria-describedby once describedBy is set — through the field a11y service this component provides for its own hlm-combobox-trigger', async () => {
    fixture.componentInstance.describedBy.set('interventions-filter-reason-status');
    await fixture.whenStable();

    expect(trigger().querySelector('button')?.getAttribute('aria-describedby')).toBe(
      'interventions-filter-reason-status',
    );
  });

  it('should drop the aria-describedby once describedBy is cleared', async () => {
    fixture.componentInstance.describedBy.set('interventions-filter-reason-status');
    await fixture.whenStable();

    fixture.componentInstance.describedBy.set(undefined);
    await fixture.whenStable();

    expect(trigger().querySelector('button')?.hasAttribute('aria-describedby')).toBe(false);
  });

  it('should cap the trigger at max-w-24 on small screens, matching the value pill — the reason no longer shares this box', () => {
    expect(trigger().className).toContain('max-w-24');
    expect(trigger().className).not.toContain('max-w-48');
  });

  it('should not report a selection picked while disabled', async () => {
    fixture.componentInstance.disabled.set(true);
    await fixture.whenStable();

    trigger().querySelector('button')?.click();
    await fixture.whenStable();

    document.querySelector<HTMLElement>('[role="option"]')?.click();
    await fixture.whenStable();

    expect(fixture.componentInstance.lastSelection).toBeNull();
  });

  it('should emit the growing selection as each value is picked from the popover', async () => {
    trigger().querySelector('button')?.click();
    await fixture.whenStable();

    Array.from(document.querySelectorAll<HTMLElement>('[role="option"]'))
      .find((option: HTMLElement): boolean => option.textContent?.trim() === 'Planned')
      ?.click();
    await fixture.whenStable();

    expect(fixture.componentInstance.lastSelection).toEqual(['planned']);
  });

  it('should normalize a null combobox selection to an empty array', () => {
    fixture.componentInstance.lastSelection = ['sentinel'];

    const combobox = fixture.debugElement.query(By.css('hlm-combobox-multiple'));
    combobox.triggerEventHandler('valueChange', null);

    expect(fixture.componentInstance.lastSelection).toEqual([]);
  });

  it('should render the optionTemplate inside a popover row and the valueTemplate inside each value chip, not in place of it', async () => {
    fixture.componentInstance.useTemplates.set(true);
    fixture.componentInstance.values.set(['planned']);
    await fixture.whenStable();

    const chip: HTMLElement | null = trigger().querySelector(
      '[data-testid="collection-filter-value"]',
    );

    expect(chip?.querySelector('[data-testid="value-template-body"]')?.textContent).toContain(
      'Planned',
    );

    trigger().querySelector('button')?.click();
    await fixture.whenStable();

    const row: Element | undefined = Array.from(
      document.querySelectorAll('hlm-combobox-item'),
    ).find((item: Element): boolean => item.textContent?.includes('In progress') ?? false);

    expect(row?.querySelector('[data-testid="option-template-body"]')?.textContent).toContain(
      'In progress',
    );
  });

  it('should open the popover from state and mirror its own dismissal back through stateChanged', async () => {
    fixture.componentInstance.state.set('open');
    await fixture.whenStable();

    expect(document.querySelector('[role="option"]')).not.toBeNull();

    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await fixture.whenStable();

    expect(fixture.componentInstance.lastState).toBe('closed');
  });

  it('should render no search box when searchPlaceholder is absent', async () => {
    fixture.componentInstance.searchPlaceholder.set(undefined);
    await fixture.whenStable();

    trigger().querySelector('button')?.click();
    await fixture.whenStable();

    expect(document.querySelector('hlm-combobox-input')).toBeNull();
  });

  it('should render the search box with the given placeholder when searchPlaceholder is set', async () => {
    trigger().querySelector('button')?.click();
    await fixture.whenStable();

    const input: HTMLInputElement | null = document.querySelector('hlm-combobox-input input');

    expect(input?.placeholder).toBe('Search a status');
  });

  it('should read the given emptyLabel once the search matches no option', async () => {
    trigger().querySelector('button')?.click();
    await fixture.whenStable();

    const input: HTMLInputElement | null = document.querySelector('hlm-combobox-input input');
    if (input) {
      input.value = 'zzz-no-match';
      input.dispatchEvent(new Event('input'));
    }
    await fixture.whenStable();

    expect(document.querySelector('hlm-combobox-content')?.hasAttribute('data-empty')).toBe(true);
    expect(document.querySelector('hlm-combobox-empty')?.textContent).toContain(
      'No status matches.',
    );
  });
});
