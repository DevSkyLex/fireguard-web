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
import { INTERACTION_CAPABILITIES_PORT } from '@core/interaction-capabilities';
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

/**
 * Function checkbox
 * @description Finds a rendered choice and fails if its checkbox is missing.
 * @access private
 * @since 1.0.0
 * @param {string} label - Visible control label.
 * @returns {HTMLElement} The rendered control.
 */
function checkbox(label: string): HTMLElement {
  const row = Array.from(document.querySelectorAll<HTMLElement>('[data-slot="item"]')).find(
    (item) => item.textContent?.trim() === label,
  );
  const control = row?.querySelector<HTMLElement>('[role="checkbox"]');
  if (!control) throw new Error(`Missing checkbox: ${label}`);
  return control;
}

/**
 * Function action
 * @description Finds a rendered drawer action and fails if it is missing.
 * @access private
 * @since 1.0.0
 * @param {string} label - Visible control label.
 * @returns {HTMLButtonElement} The rendered control.
 */
function action(label: string): HTMLButtonElement {
  const button = Array.from(
    document.querySelectorAll<HTMLButtonElement>('hlm-drawer-footer button'),
  ).find((item) => item.textContent?.trim() === label);
  if (!button) throw new Error(`Missing drawer action: ${label}`);
  return button;
}

describe('CollectionFilterMultiSelect', () => {
  it.each([
    { value: 'planned' },
    { value: 42 },
    { value: { value: ['planned'] } },
    { value: ['planned', 42] },
    { value: ['planned', null] },
  ])(
    'should reject malformed combobox output $value without partially applying it',
    ({ value }) => {
      fixture.componentInstance.lastSelection = ['sentinel'];
      fixture.debugElement
        .query(By.css('hlm-combobox-multiple'))
        .triggerEventHandler('valueChange', value);
      expect(fixture.componentInstance.lastSelection).toEqual(['sentinel']);
    },
  );

  it.each([null, undefined])('should normalize empty combobox output %s', (value) => {
    fixture.componentInstance.lastSelection = ['sentinel'];
    fixture.debugElement
      .query(By.css('hlm-combobox-multiple'))
      .triggerEventHandler('valueChange', value);
    expect(fixture.componentInstance.lastSelection).toEqual([]);
  });

  it('should accept a readonly string selection from the combobox', () => {
    fixture.debugElement
      .query(By.css('hlm-combobox-multiple'))
      .triggerEventHandler('valueChange', Object.freeze(['planned', 'published']));
    expect(fixture.componentInstance.lastSelection).toEqual(['planned', 'published']);
  });

  const mobileInteractionMode = signal(false);
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
    mobileInteractionMode.set(false);
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        {
          provide: INTERACTION_CAPABILITIES_PORT,
          useValue: { isMobileInteractionMode: mobileInteractionMode },
        },
      ],
    });

    fixture = TestBed.createComponent(CollectionFilterMultiSelectHost);
    await fixture.whenStable();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  /**
   * Function useMobileFixture
   * @description Creates the host in the mobile interaction mode before its first render.
   * @access private
   * @since 1.0.0
   * @returns {Promise<void>} The stabilized mobile fixture.
   */
  async function useMobileFixture(): Promise<void> {
    fixture.destroy();
    mobileInteractionMode.set(true);
    fixture = TestBed.createComponent(CollectionFilterMultiSelectHost);
    await fixture.whenStable();
  }

  it.each([false, true])(
    'should describe mobile values and preserve caller descriptions with disabled=%s',
    async (disabled) => {
      await useMobileFixture();
      fixture.componentInstance.disabled.set(disabled);
      await fixture.whenStable();

      const valueId = `${trigger().id}-mobile-value`;
      expect(trigger().getAttribute('aria-describedby')).toBe(valueId);
      expect(document.getElementById(valueId)?.textContent?.trim()).toBe('Status');

      fixture.componentInstance.values.set(['planned', 'in_progress', 'submitted', 'published']);
      fixture.componentInstance.useTemplates.set(true);
      fixture.componentInstance.describedBy.set('filter-reason filter-hint');
      await fixture.whenStable();

      expect(trigger().getAttribute('aria-describedby')).toBe(
        `${valueId} filter-reason filter-hint`,
      );
      const description = document.getElementById(valueId);
      expect(trigger().contains(description)).toBe(true);
      expect(description?.querySelectorAll('[data-testid="collection-filter-value"]')).toHaveLength(
        2,
      );
      expect(description?.textContent).toContain('Planned');
      expect(description?.textContent).toContain('In progress');
      expect(description?.textContent).toContain('+2');
      expect(description?.querySelector('.sr-only')?.textContent).toBe(
        'Also selected: Submitted, Published',
      );
      if (disabled) expect(trigger().getAttribute('aria-disabled')).toBe('true');
      expect(trigger().hasAttribute('disabled')).toBe(false);

      fixture.componentInstance.disabled.set(!disabled);
      fixture.componentInstance.describedBy.set(undefined);
      fixture.componentInstance.values.set([]);
      await fixture.whenStable();

      expect(trigger().getAttribute('aria-describedby')).toBe(valueId);
      expect(document.querySelectorAll(`[id="${valueId}"]`)).toHaveLength(1);
      expect(document.getElementById(valueId)?.textContent?.trim()).toBe('Status');
    },
  );

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

    expect(chips).toHaveLength(2);
    expect(chips[0].textContent).toContain('Planned');
    expect(chips[1].textContent).toContain('In progress');
  });

  it('should collapse the values beyond maxVisible into a +N marker', async () => {
    fixture.componentInstance.values.set(['planned', 'in_progress', 'submitted', 'published']);
    await fixture.whenStable();

    expect(trigger().querySelectorAll('[data-testid="collection-filter-value"]')).toHaveLength(2);
    expect(trigger().textContent).toContain('+2');
  });

  it('should never collapse every value, even when maxVisible is zero', async () => {
    fixture.componentInstance.maxVisible.set(0);
    fixture.componentInstance.values.set(['planned', 'in_progress']);
    await fixture.whenStable();

    expect(trigger().querySelectorAll('[data-testid="collection-filter-value"]')).toHaveLength(1);
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

  describe('mobile drawer', () => {
    it.each(['trigger', 'controlled'])(
      'should preserve an edited draft after external values change (%s opening)',
      async (opening) => {
        await useMobileFixture();
        fixture.componentInstance.values.set(['published']);
        await fixture.whenStable();
        if (opening === 'controlled') fixture.componentInstance.state.set('open');
        else trigger().click();
        await fixture.whenStable();

        expect(checkbox('Published').getAttribute('aria-checked')).toBe('true');
        checkbox('Planned').click();
        await fixture.whenStable();
        fixture.componentInstance.values.set(['submitted']);
        await fixture.whenStable();

        expect(checkbox('Published').getAttribute('aria-checked')).toBe('true');
        expect(checkbox('Planned').getAttribute('aria-checked')).toBe('true');
        action('Apply').click();
        await fixture.whenStable();
        expect(fixture.componentInstance.lastSelection).toEqual(['published', 'planned']);
      },
    );

    it('should emit one committed value before closing even when Apply is clicked twice', async () => {
      await useMobileFixture();
      fixture.componentInstance.values.set(['planned']);
      await fixture.whenStable();
      trigger().click();
      await fixture.whenStable();
      const control: CollectionFilterMultiSelect = fixture.debugElement.query(
        By.directive(CollectionFilterMultiSelect),
      ).componentInstance;
      const events: string[] = [];
      control.valuesChanged.subscribe(() => events.push('value'));
      control.stateChanged.subscribe((state) => events.push(state));
      const apply = action('Apply');
      apply.click();
      apply.click();
      await fixture.whenStable();

      expect(events).toEqual(['value', 'closed']);
      expect(document.querySelector('hlm-drawer-content')).toBeNull();
    });

    it('should keep a disabled draft open without applying or changing its selection', async () => {
      await useMobileFixture();
      trigger().click();
      await fixture.whenStable();
      checkbox('Planned').click();
      await fixture.whenStable();
      fixture.componentInstance.disabled.set(true);
      await fixture.whenStable();
      expect(action('Apply').disabled).toBe(true);
      action('Apply').click();
      checkbox('Published').click();
      await fixture.whenStable();
      expect(fixture.componentInstance.lastSelection).toBeNull();
      expect(document.querySelector('hlm-drawer-content')?.getAttribute('data-state')).toBe('open');
      fixture.componentInstance.disabled.set(false);
      await fixture.whenStable();
      action('Apply').click();
      await fixture.whenStable();
      expect(fixture.componentInstance.lastSelection).toEqual(['planned']);
    });

    it.each(['Cancel', 'Escape', 'controlled'])(
      'should seed the next opening from current values after %s',
      async (dismissal) => {
        await useMobileFixture();
        fixture.componentInstance.values.set(['published']);
        fixture.componentInstance.state.set('open');
        await fixture.whenStable();
        checkbox('Planned').click();
        await fixture.whenStable();
        if (dismissal === 'Cancel') action('Cancel').click();
        else if (dismissal === 'Escape')
          document.body.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
          );
        fixture.componentInstance.state.set('closed');
        await fixture.whenStable();
        expect(fixture.componentInstance.lastSelection).toBeNull();
        fixture.componentInstance.values.set(['submitted']);
        fixture.componentInstance.state.set('open');
        await fixture.whenStable();
        expect(checkbox('Submitted').getAttribute('aria-checked')).toBe('true');
        expect(checkbox('Planned').getAttribute('aria-checked')).toBe('false');
        expect(checkbox('Published').getAttribute('aria-checked')).toBe('false');
      },
    );

    it('should replace the anchored multi-combobox in mobile interaction mode at any width', async () => {
      await useMobileFixture();

      expect(
        (fixture.nativeElement as HTMLElement).querySelector('hlm-combobox-multiple'),
      ).toBeNull();

      trigger().click();
      await fixture.whenStable();

      expect(
        document.querySelector('[data-testid="interventions-filter-status-drawer"]'),
      ).not.toBeNull();
    });

    it('should stage checkbox changes until Apply is activated', async () => {
      await useMobileFixture();
      trigger().click();
      await fixture.whenStable();

      const plannedRow: HTMLElement | undefined = Array.from(
        document.querySelectorAll<HTMLElement>('[data-slot="item"]'),
      ).find((row: HTMLElement): boolean => row.textContent?.includes('Planned') ?? false);
      plannedRow?.querySelector<HTMLElement>('[role="checkbox"]')?.click();
      await fixture.whenStable();

      expect(fixture.componentInstance.lastSelection).toBeNull();

      Array.from(document.querySelectorAll<HTMLButtonElement>('hlm-drawer-content button'))
        .find(
          (button: HTMLButtonElement): boolean => button.textContent?.includes('Apply') ?? false,
        )
        ?.click();
      await fixture.whenStable();

      expect(fixture.componentInstance.lastSelection).toEqual(['planned']);
    });

    it('should discard staged changes when Cancel closes the drawer', async () => {
      await useMobileFixture();
      fixture.componentInstance.values.set(['published']);
      await fixture.whenStable();
      trigger().click();
      await fixture.whenStable();

      const plannedRow: HTMLElement | undefined = Array.from(
        document.querySelectorAll<HTMLElement>('[data-slot="item"]'),
      ).find((row: HTMLElement): boolean => row.textContent?.includes('Planned') ?? false);
      plannedRow?.querySelector<HTMLElement>('[role="checkbox"]')?.click();
      await fixture.whenStable();

      Array.from(document.querySelectorAll<HTMLButtonElement>('hlm-drawer-content button'))
        .find(
          (button: HTMLButtonElement): boolean => button.textContent?.includes('Cancel') ?? false,
        )
        ?.click();
      await fixture.whenStable();

      expect(fixture.componentInstance.lastSelection).toBeNull();
      expect(fixture.componentInstance.values()).toEqual(['published']);
    });
  });
});
