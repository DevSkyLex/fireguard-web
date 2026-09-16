import {
  Component,
  provideZonelessChangeDetection,
  signal,
  type WritableSignal,
} from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { INTERACTION_CAPABILITIES_PORT } from '@core/interaction-capabilities';
import type { CollectionFilterPopoverState } from '../../../../models';
import { CollectionFilterDate } from '../collection-filter-date.component';

@Component({
  selector: 'app-collection-filter-date-host',
  imports: [CollectionFilterDate],
  template: `
    <app-collection-filter-date
      [value]="value()"
      placeholder="Due date"
      accessibleName="Change filter: Due date"
      triggerId="interventions-filter-due"
      testId="interventions-filter-due"
      [state]="state()"
      [disabled]="disabled()"
      [describedBy]="describedBy()"
      (valueChanged)="lastValue = $event"
      (stateChanged)="lastState = $event"
    />
  `,
})
class CollectionFilterDateHost {
  public lastValue: Date | null = null;
  public lastState: CollectionFilterPopoverState | null = null;
  public readonly value: WritableSignal<Date | null> = signal<Date | null>(null);
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

describe('CollectionFilterDate', () => {
  const mobileInteractionMode = signal(false);
  let fixture: ComponentFixture<CollectionFilterDateHost>;

  const trigger = (): HTMLElement =>
    (fixture.nativeElement as HTMLElement).querySelector(
      '[data-testid="interventions-filter-due"]',
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

    fixture = TestBed.createComponent(CollectionFilterDateHost);
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
    fixture = TestBed.createComponent(CollectionFilterDateHost);
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
      expect(document.getElementById(valueId)?.textContent?.trim()).toBe('Due date');

      const date = new Date(2026, 0, 15);
      fixture.componentInstance.value.set(date);
      fixture.componentInstance.describedBy.set('filter-reason filter-hint');
      await fixture.whenStable();

      expect(trigger().getAttribute('aria-describedby')).toBe(
        `${valueId} filter-reason filter-hint`,
      );
      const description = document.getElementById(valueId);
      expect(trigger().contains(description)).toBe(true);
      expect(description?.textContent?.trim()).toBe(date.toDateString());
      if (disabled) expect(trigger().getAttribute('aria-disabled')).toBe('true');
      expect(trigger().hasAttribute('disabled')).toBe(false);

      fixture.componentInstance.disabled.set(!disabled);
      fixture.componentInstance.describedBy.set(undefined);
      fixture.componentInstance.value.set(null);
      await fixture.whenStable();

      expect(trigger().getAttribute('aria-describedby')).toBe(valueId);
      expect(document.querySelectorAll(`[id="${valueId}"]`).length).toBe(1);
      expect(document.getElementById(valueId)?.textContent?.trim()).toBe('Due date');
    },
  );

  it('should read as the field label while no value is set', () => {
    expect(trigger().textContent).toContain('Due date');
    expect(trigger().querySelectorAll('[data-testid="collection-filter-value"]').length).toBe(0);
  });

  it('should render the picked date in the value pastille', async () => {
    const date = new Date(2026, 0, 15);
    fixture.componentInstance.value.set(date);
    await fixture.whenStable();

    const chip: HTMLElement | null = trigger().querySelector(
      '[data-testid="collection-filter-value"]',
    );

    expect(chip?.textContent).toContain(date.toDateString());
  });

  it('should name the trigger through a visually hidden label bound to its id', () => {
    const label: HTMLLabelElement | null = (fixture.nativeElement as HTMLElement).querySelector(
      'label[for="interventions-filter-due"]',
    );

    expect(label?.textContent).toContain('Change filter: Due date');
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

  it('should not report a date picked while disabled', async () => {
    fixture.componentInstance.disabled.set(true);
    fixture.componentInstance.state.set('open');
    await fixture.whenStable();

    calendarDayButtons()
      .find((button: HTMLButtonElement): boolean => !button.disabled)
      ?.click();
    await fixture.whenStable();

    expect(fixture.componentInstance.lastValue).toBeNull();
  });

  it('should emit the date picked from the calendar', async () => {
    fixture.componentInstance.state.set('open');
    await fixture.whenStable();

    calendarDayButtons()
      .find((button: HTMLButtonElement): boolean => !button.disabled)
      ?.click();
    await fixture.whenStable();

    expect(fixture.componentInstance.lastValue).toBeInstanceOf(Date);
  });

  it('should open a mobile drawer from controlled state and close it after a date pick', async () => {
    await useMobileFixture();
    fixture.componentInstance.state.set('open');
    await fixture.whenStable();

    expect(
      document.querySelector('[data-testid="interventions-filter-due-drawer"]'),
    ).not.toBeNull();

    calendarDayButtons()
      .find((button: HTMLButtonElement): boolean => !button.disabled)
      ?.click();
    await fixture.whenStable();

    expect(fixture.componentInstance.lastValue).toBeInstanceOf(Date);
    expect(fixture.componentInstance.lastState).toBe('closed');
  });
});
