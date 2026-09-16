import {
  Component,
  provideZonelessChangeDetection,
  signal,
  type WritableSignal,
} from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { INTERACTION_CAPABILITIES_PORT } from '@core/interaction-capabilities';
import type { CollectionFilterPopoverState } from '../../../../models';
import { CollectionFilterDateRange } from '../collection-filter-date-range.component';

@Component({
  selector: 'app-collection-filter-date-range-host',
  imports: [CollectionFilterDateRange],
  template: `
    <app-collection-filter-date-range
      [value]="value()"
      placeholder="Due range"
      accessibleName="Change filter: Due range"
      triggerId="interventions-filter-due-range"
      testId="interventions-filter-due-range"
      [state]="state()"
      [disabled]="disabled()"
      [describedBy]="describedBy()"
      (valueChanged)="lastValue = $event"
      (stateChanged)="lastState = $event"
    />
  `,
})
class CollectionFilterDateRangeHost {
  public lastValue: readonly [Date, Date] | null = null;
  public lastState: CollectionFilterPopoverState | null = null;
  public readonly value: WritableSignal<readonly [Date, Date] | null> = signal<
    readonly [Date, Date] | null
  >(null);
  public readonly disabled: WritableSignal<boolean> = signal<boolean>(false);
  public readonly describedBy: WritableSignal<string | undefined> = signal<string | undefined>(
    undefined,
  );
  public readonly state: WritableSignal<CollectionFilterPopoverState> =
    signal<CollectionFilterPopoverState>('closed');
}

/** Minimal ResizeObserver stand-in: the popover observes its anchor, and the test environment provides no implementation. */
class ResizeObserverStub {
  public observe(): void {}
  public unobserve(): void {}
  public disconnect(): void {}
}

const calendarDayButtons = (): HTMLButtonElement[] =>
  Array.from(document.querySelectorAll<HTMLButtonElement>('tbody[role="rowgroup"] button'));

/**
 * The buttons belonging to the currently displayed month, excluding the
 * leading/trailing days of the adjacent months the grid also renders.
 * Picking a `start` outside the displayed month shifts the calendar's own
 * focused month and re-renders the whole grid, detaching whichever `end`
 * button a test already queried — staying inside one month keeps both
 * picks on live nodes.
 */
const currentMonthDayButtons = (): HTMLButtonElement[] =>
  calendarDayButtons().filter(
    (button: HTMLButtonElement): boolean => button.getAttribute('data-outside') !== 'true',
  );

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

describe('CollectionFilterDateRange', () => {
  const mobileInteractionMode = signal(false);
  let fixture: ComponentFixture<CollectionFilterDateRangeHost>;

  const trigger = (): HTMLElement =>
    (fixture.nativeElement as HTMLElement).querySelector(
      '[data-testid="interventions-filter-due-range"]',
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

    fixture = TestBed.createComponent(CollectionFilterDateRangeHost);
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
    fixture = TestBed.createComponent(CollectionFilterDateRangeHost);
    await fixture.whenStable();
  }

  it('should open the popover when state changes to open, and mirror its own dismissal back through stateChanged', async () => {
    fixture.componentInstance.state.set('open');
    await fixture.whenStable();

    expect(document.querySelector('tbody[role="rowgroup"]')).not.toBeNull();

    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await fixture.whenStable();

    expect(fixture.componentInstance.lastState).toBe('closed');
    expect(document.querySelector('tbody[role="rowgroup"]')).toBeNull();
  });

  it.each([false, true])(
    'should describe mobile values and preserve caller descriptions with disabled=%s',
    async (disabled) => {
      await useMobileFixture();
      fixture.componentInstance.disabled.set(disabled);
      await fixture.whenStable();

      const valueId = `${trigger().id}-mobile-value`;
      expect(trigger().getAttribute('aria-describedby')).toBe(valueId);
      expect(document.getElementById(valueId)?.textContent?.trim()).toBe('Due range');

      const start = new Date(2026, 0, 5);
      const end = new Date(2026, 0, 20);
      fixture.componentInstance.value.set([start, end]);
      fixture.componentInstance.describedBy.set('filter-reason filter-hint');
      await fixture.whenStable();

      expect(trigger().getAttribute('aria-describedby')).toBe(
        `${valueId} filter-reason filter-hint`,
      );
      const description = document.getElementById(valueId);
      expect(trigger().contains(description)).toBe(true);
      expect(description?.textContent).toContain(start.toDateString());
      expect(description?.textContent).toContain(end.toDateString());
      if (disabled) expect(trigger().getAttribute('aria-disabled')).toBe('true');
      expect(trigger().hasAttribute('disabled')).toBe(false);

      fixture.componentInstance.disabled.set(!disabled);
      fixture.componentInstance.describedBy.set(undefined);
      fixture.componentInstance.value.set(null);
      await fixture.whenStable();

      expect(trigger().getAttribute('aria-describedby')).toBe(valueId);
      expect(document.querySelectorAll(`[id="${valueId}"]`).length).toBe(1);
      expect(document.getElementById(valueId)?.textContent?.trim()).toBe('Due range');
    },
  );

  it('should read as the field label while no value is set', () => {
    expect(trigger().textContent).toContain('Due range');
    expect(trigger().querySelectorAll('[data-testid="collection-filter-value"]').length).toBe(0);
  });

  it('should render the picked range in the value pastille', async () => {
    const start = new Date(2026, 0, 5);
    const end = new Date(2026, 0, 20);
    fixture.componentInstance.value.set([start, end]);
    await fixture.whenStable();

    const chip: HTMLElement | null = trigger().querySelector(
      '[data-testid="collection-filter-value"]',
    );

    expect(chip?.textContent).toContain(start.toDateString());
    expect(chip?.textContent).toContain(end.toDateString());
  });

  it('should name the trigger through a visually hidden label bound to its id', () => {
    const label: HTMLLabelElement | null = (fixture.nativeElement as HTMLElement).querySelector(
      'label[for="interventions-filter-due-range"]',
    );

    expect(label?.textContent).toContain('Change filter: Due range');
    expect(label?.className).toContain('sr-only');
  });

  it('should keep the trigger focusable and mark it aria-disabled while disabled', async () => {
    fixture.componentInstance.disabled.set(true);
    await fixture.whenStable();

    const button: HTMLButtonElement = trigger() as HTMLButtonElement;

    expect(button.disabled).toBeFalsy();
    expect(button.getAttribute('aria-disabled')).toBe('true');
  });

  it('should carry no aria-describedby while describedBy is unset', () => {
    expect(trigger().hasAttribute('aria-describedby')).toBe(false);
  });

  it('should carry the given reason row id as its aria-describedby once describedBy is set', async () => {
    fixture.componentInstance.describedBy.set('interventions-filter-reason-dueRange');
    await fixture.whenStable();

    expect(trigger().getAttribute('aria-describedby')).toBe('interventions-filter-reason-dueRange');
  });

  it('should drop the aria-describedby once describedBy is cleared', async () => {
    fixture.componentInstance.describedBy.set('interventions-filter-reason-dueRange');
    await fixture.whenStable();

    fixture.componentInstance.describedBy.set(undefined);
    await fixture.whenStable();

    expect(trigger().hasAttribute('aria-describedby')).toBe(false);
  });

  it('should cap the trigger at max-w-24 on small screens, matching the value pill — the reason no longer shares this box', () => {
    expect(trigger().className).toContain('max-w-24');
    expect(trigger().className).not.toContain('max-w-48');
  });

  it('should not report a range picked while disabled', async () => {
    fixture.componentInstance.disabled.set(true);
    fixture.componentInstance.state.set('open');
    await fixture.whenStable();

    currentMonthDayButtons()[0]?.click();
    await fixture.whenStable();
    currentMonthDayButtons()[10]?.click();
    await fixture.whenStable();

    expect(fixture.componentInstance.lastValue).toBeNull();
  });

  it('should emit the complete range picked from the calendar', async () => {
    fixture.componentInstance.state.set('open');
    await fixture.whenStable();

    currentMonthDayButtons()[0]?.click();
    await fixture.whenStable();
    currentMonthDayButtons()[10]?.click();
    await fixture.whenStable();

    expect(fixture.componentInstance.lastValue).not.toBeNull();
    expect(fixture.componentInstance.lastValue?.[0]).toBeInstanceOf(Date);
    expect(fixture.componentInstance.lastValue?.[1]).toBeInstanceOf(Date);
  });

  it('should stage a mobile range in a drawer until Apply is activated', async () => {
    await useMobileFixture();
    fixture.componentInstance.state.set('open');
    await fixture.whenStable();

    expect(
      document.querySelector('[data-testid="interventions-filter-due-range-drawer"]'),
    ).not.toBeNull();

    currentMonthDayButtons()[0]?.click();
    await fixture.whenStable();
    currentMonthDayButtons()[10]?.click();
    await fixture.whenStable();

    expect(fixture.componentInstance.lastValue).toBeNull();

    Array.from(document.querySelectorAll<HTMLButtonElement>('hlm-drawer-content button'))
      .find((button: HTMLButtonElement): boolean => button.textContent?.includes('Apply') ?? false)
      ?.click();
    await fixture.whenStable();

    expect(fixture.componentInstance.lastValue?.[0]).toBeInstanceOf(Date);
    expect(fixture.componentInstance.lastValue?.[1]).toBeInstanceOf(Date);
  });

  describe('mobile drafts', () => {
    /**
     * Function pickRange
     * @description Selects two days in the displayed month through the calendar boundary.
     * @access private
     * @since 1.0.0
     * @returns {Promise<void>} The stabilized staged range.
     */
    async function pickRange(): Promise<void> {
      const start = currentMonthDayButtons()[1];
      if (!start) throw new Error('Missing start date');
      start.click();
      await fixture.whenStable();
      const end = currentMonthDayButtons()[10];
      if (!end) throw new Error('Missing end date');
      end.click();
      await fixture.whenStable();
    }

    it.each(['trigger', 'controlled'])(
      'should preserve the draft after an external range change (%s opening)',
      async (opening) => {
        await useMobileFixture();
        if (opening === 'controlled') fixture.componentInstance.state.set('open');
        else trigger().click();
        await fixture.whenStable();
        await pickRange();
        fixture.componentInstance.value.set([new Date(2025, 0, 5), new Date(2025, 0, 20)]);
        await fixture.whenStable();
        action('Apply').click();
        await fixture.whenStable();

        expect(fixture.componentInstance.lastValue?.[0].getDate()).toBe(2);
        expect(fixture.componentInstance.lastValue?.[1].getDate()).toBe(11);
      },
    );

    it('should emit once before explicitly closing when Apply is clicked twice', async () => {
      await useMobileFixture();
      fixture.componentInstance.state.set('open');
      await fixture.whenStable();
      await pickRange();
      const control: CollectionFilterDateRange = fixture.debugElement.query(
        By.directive(CollectionFilterDateRange),
      ).componentInstance;
      const events: string[] = [];
      control.valueChanged.subscribe(() => events.push('value'));
      control.stateChanged.subscribe((state) => events.push(state));
      const apply = action('Apply');
      apply.click();
      apply.click();
      await fixture.whenStable();

      expect(events).toEqual(['value', 'closed']);
      expect(document.querySelector('hlm-drawer-content')).toBeNull();
    });

    it('should disable Apply for an incomplete or unavailable draft and keep Cancel available', async () => {
      await useMobileFixture();
      fixture.componentInstance.state.set('open');
      await fixture.whenStable();
      expect(action('Apply').disabled).toBe(true);
      currentMonthDayButtons()[1]?.click();
      await fixture.whenStable();
      expect(action('Apply').disabled).toBe(true);
      currentMonthDayButtons()[10]?.click();
      await fixture.whenStable();
      fixture.componentInstance.disabled.set(true);
      await fixture.whenStable();
      expect(action('Apply').disabled).toBe(true);
      action('Apply').click();
      expect(document.querySelector('hlm-drawer-content')?.getAttribute('data-state')).toBe('open');
      action('Cancel').click();
      await fixture.whenStable();
      expect(fixture.componentInstance.lastValue).toBeNull();
      expect(document.querySelector('hlm-drawer-content')).toBeNull();
    });

    it.each(['Cancel', 'Escape', 'controlled'])(
      'should discard the draft and initialize the next controlled opening after %s',
      async (dismissal) => {
        await useMobileFixture();
        fixture.componentInstance.state.set('open');
        await fixture.whenStable();
        await pickRange();
        if (dismissal === 'Cancel') action('Cancel').click();
        else if (dismissal === 'Escape')
          document.body.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
          );
        fixture.componentInstance.state.set('closed');
        await fixture.whenStable();
        expect(fixture.componentInstance.lastValue).toBeNull();
        const next: readonly [Date, Date] = [new Date(2026, 0, 5), new Date(2026, 0, 20)];
        fixture.componentInstance.value.set(next);
        fixture.componentInstance.state.set('open');
        await fixture.whenStable();
        action('Apply').click();
        await fixture.whenStable();
        expect(fixture.componentInstance.lastValue).toEqual(next);
      },
    );
  });
});
