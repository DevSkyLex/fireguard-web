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
import { CollectionFilterSelect } from '../collection-filter-select.component';

const OPTIONS: readonly CollectionFilterOption[] = [
  { value: 'planned', label: 'Planned', group: 'planning', groupLabel: 'Planning' },
  { value: 'in_progress', label: 'In progress', group: 'execution', groupLabel: 'Execution' },
];

@Component({
  selector: 'app-collection-filter-select-host',
  imports: [CollectionFilterSelect],
  template: `
    <app-collection-filter-select
      [options]="options"
      [value]="value()"
      placeholder="Status"
      [searchPlaceholder]="searchPlaceholder()"
      emptyLabel="No status matches."
      accessibleName="Change filter: Status"
      triggerId="interventions-filter-status"
      testId="interventions-filter-status"
      [state]="state()"
      [disabled]="disabled()"
      [describedBy]="describedBy()"
      [optionTemplate]="optionTemplate()"
      [valueTemplate]="valueTemplate()"
      (valueChanged)="lastValue = $event"
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
class CollectionFilterSelectHost {
  public readonly options: readonly CollectionFilterOption[] = OPTIONS;
  public lastValue: string | null = null;
  public lastState: CollectionFilterPopoverState | null = null;
  public readonly value: WritableSignal<string | null> = signal<string | null>(null);
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

describe('CollectionFilterSelect', () => {
  it.each([
    { value: 42 },
    { value: false },
    { value: { value: 'planned' } },
    { value: ['planned'] },
  ])('should reject malformed combobox output $value', ({ value }) => {
    fixture.componentInstance.lastValue = 'sentinel';
    fixture.debugElement.query(By.css('hlm-combobox')).triggerEventHandler('valueChange', value);
    expect(fixture.componentInstance.lastValue).toBe('sentinel');
  });

  it.each([null, undefined])('should normalize empty combobox output %s', (value) => {
    fixture.componentInstance.lastValue = 'sentinel';
    fixture.debugElement.query(By.css('hlm-combobox')).triggerEventHandler('valueChange', value);
    expect(fixture.componentInstance.lastValue).toBeNull();
  });

  it('should preserve frozen catalog order and labels when options share a group', async () => {
    fixture.destroy();
    mobileInteractionMode.set(true);
    const selectFixture = TestBed.createComponent(CollectionFilterSelect);
    const options: readonly CollectionFilterOption[] = Object.freeze([
      Object.freeze({ value: 'first', label: 'First', group: 'one', groupLabel: 'Group one' }),
      Object.freeze({ value: 'second', label: 'Second', group: 'two', groupLabel: 'Group two' }),
      Object.freeze({
        value: 'third',
        label: 'Third',
        group: 'one',
        groupLabel: 'Ignored heading',
      }),
    ]);
    for (const name of ['placeholder', 'accessibleName', 'triggerId', 'testId', 'emptyLabel']) {
      selectFixture.componentRef.setInput(name, name);
    }
    selectFixture.componentRef.setInput('options', options);
    selectFixture.componentRef.setInput('value', null);
    selectFixture.componentRef.setInput('state', 'open');
    await selectFixture.whenStable();

    const groups = Array.from(document.querySelectorAll('[hlmCommandGroup]'));
    expect(
      groups.map((group) => group.querySelector('[hlmCommandGroupLabel]')?.textContent?.trim()),
    ).toEqual(['Group one', 'Group two']);
    expect(
      groups.map((group) =>
        Array.from(group.querySelectorAll('[hlmCommandItem]')).map((item) =>
          item.textContent?.trim(),
        ),
      ),
    ).toEqual([['First', 'Third'], ['Second']]);
    expect(options.map((option) => option.value)).toEqual(['first', 'second', 'third']);
    selectFixture.destroy();
  });

  const mobileInteractionMode = signal(false);
  let fixture: ComponentFixture<CollectionFilterSelectHost>;

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

    fixture = TestBed.createComponent(CollectionFilterSelectHost);
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
    fixture = TestBed.createComponent(CollectionFilterSelectHost);
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

      fixture.componentInstance.value.set('planned');
      fixture.componentInstance.useTemplates.set(true);
      fixture.componentInstance.describedBy.set('filter-reason filter-hint');
      await fixture.whenStable();

      expect(trigger().getAttribute('aria-describedby')).toBe(
        `${valueId} filter-reason filter-hint`,
      );
      const description = document.getElementById(valueId);
      expect(trigger().contains(description)).toBe(true);
      expect(description?.querySelector('[data-testid="value-template-body"]')?.textContent).toBe(
        'Planned',
      );
      if (disabled) expect(trigger().getAttribute('aria-disabled')).toBe('true');
      expect(trigger().hasAttribute('disabled')).toBe(false);

      fixture.componentInstance.disabled.set(!disabled);
      fixture.componentInstance.describedBy.set(undefined);
      fixture.componentInstance.value.set(null);
      await fixture.whenStable();

      expect(trigger().getAttribute('aria-describedby')).toBe(valueId);
      expect(document.querySelectorAll(`[id="${valueId}"]`)).toHaveLength(1);
      expect(document.getElementById(valueId)?.textContent?.trim()).toBe('Status');
    },
  );

  it('should read as the field label while no value is set', () => {
    expect(trigger().textContent).toContain('Status');
    expect(trigger().querySelectorAll('[data-testid="collection-filter-value"]')).toHaveLength(0);
  });

  it('should render the value as the same single filled chip its multi-value sibling uses', async () => {
    fixture.componentInstance.value.set('in_progress');
    await fixture.whenStable();

    const chips: NodeListOf<HTMLElement> = trigger().querySelectorAll(
      '[data-testid="collection-filter-value"]',
    );

    expect(chips).toHaveLength(1);
    expect(chips[0].textContent).toContain('In progress');
  });

  it('should name the trigger through a visually hidden label bound to its id', () => {
    const label: HTMLLabelElement | null = (fixture.nativeElement as HTMLElement).querySelector(
      'label[for="interventions-filter-status"]',
    );

    expect(label?.textContent).toContain('Change filter: Status');
    expect(label?.className).toContain('sr-only');
  });

  it('should name an unknown value instead of leaking the raw key', async () => {
    fixture.componentInstance.value.set('archived');
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

  it('should not report a value picked while disabled', async () => {
    fixture.componentInstance.disabled.set(true);
    await fixture.whenStable();

    trigger().querySelector('button')?.click();
    await fixture.whenStable();

    document.querySelector<HTMLElement>('[role="option"]')?.click();
    await fixture.whenStable();

    expect(fixture.componentInstance.lastValue).toBeNull();
  });

  it('should emit the value picked from the popover', async () => {
    trigger().querySelector('button')?.click();
    await fixture.whenStable();

    Array.from(document.querySelectorAll<HTMLElement>('[role="option"]'))
      .find((option: HTMLElement): boolean => option.textContent?.trim() === 'In progress')
      ?.click();
    await fixture.whenStable();

    expect(fixture.componentInstance.lastValue).toBe('in_progress');
  });

  it('should retain option group headings in the desktop combobox', async () => {
    trigger().querySelector('button')?.click();
    await fixture.whenStable();

    const content: string = document.querySelector('hlm-combobox-content')?.textContent ?? '';
    expect(content).toContain('Planning');
    expect(content).toContain('Execution');
  });

  it('should normalize a cleared combobox value to null rather than passing undefined through', () => {
    fixture.componentInstance.lastValue = 'sentinel';

    const combobox = fixture.debugElement.query(By.css('hlm-combobox'));
    combobox.triggerEventHandler('valueChange', undefined);

    expect(fixture.componentInstance.lastValue).toBeNull();
  });

  it('should render the optionTemplate inside a popover row and the valueTemplate inside the value chip, not in place of it', async () => {
    fixture.componentInstance.useTemplates.set(true);
    fixture.componentInstance.value.set('planned');
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
    it('should replace the anchored combobox in mobile interaction mode at any width', async () => {
      await useMobileFixture();

      expect((fixture.nativeElement as HTMLElement).querySelector('hlm-combobox')).toBeNull();

      trigger().click();
      await fixture.whenStable();

      expect(
        document.querySelector('[data-testid="interventions-filter-status-drawer"]'),
      ).not.toBeNull();
    });

    it('should support keyboard selection through the Spartan command input', async () => {
      await useMobileFixture();
      fixture.componentInstance.searchPlaceholder.set(undefined);
      trigger().click();
      await fixture.whenStable();
      const input: HTMLInputElement | null = document.querySelector('input[role="combobox"]');
      expect(input).not.toBeNull();
      input?.focus();
      input?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      await fixture.whenStable();
      const activeId = input?.getAttribute('aria-activedescendant');
      expect(activeId).toBeTruthy();
      input?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      await fixture.whenStable();
      expect(fixture.componentInstance.lastValue).not.toBeNull();
      expect(
        document.querySelector('[data-testid="interventions-filter-status-drawer"]'),
      ).toBeNull();
    });

    it('should search the drawer options and commit a picked value immediately', async () => {
      await useMobileFixture();
      trigger().click();
      await fixture.whenStable();

      const input: HTMLInputElement | null = document.querySelector(
        '#interventions-filter-status-mobile-search',
      );
      if (input) {
        input.value = 'progress';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
      await fixture.whenStable();

      const options: HTMLElement[] = Array.from(
        document.querySelectorAll<HTMLElement>('[role="option"]'),
      ).filter((option: HTMLElement): boolean => !option.hasAttribute('data-hidden'));
      expect(
        options.map((option: HTMLElement): string => option.textContent?.trim() ?? ''),
      ).toEqual(['In progress']);

      options[0]?.click();
      await fixture.whenStable();

      expect(fixture.componentInstance.lastValue).toBe('in_progress');
    });

    it('should expose the native Command empty state when no option matches', async () => {
      await useMobileFixture();
      trigger().click();
      await fixture.whenStable();

      const input: HTMLInputElement | null = document.querySelector(
        '#interventions-filter-status-mobile-search',
      );
      if (input) {
        input.value = 'zzz-no-match';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
      await fixture.whenStable();

      expect(document.querySelector('[data-slot="command-empty"]')?.textContent).toContain(
        'No status matches.',
      );
    });

    it('should retain option group headings in the mobile drawer', async () => {
      await useMobileFixture();
      trigger().click();
      await fixture.whenStable();

      const drawer: HTMLElement | null = document.querySelector(
        '[data-testid="interventions-filter-status-drawer"]',
      );
      expect(drawer?.textContent).toContain('Planning');
      expect(drawer?.textContent).toContain('Execution');
    });
  });
});
