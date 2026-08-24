import {
  Component,
  provideZonelessChangeDetection,
  signal,
  type WritableSignal,
} from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
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
      [tooltip]="tooltip()"
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
  public readonly tooltip: WritableSignal<string> = signal<string>('');
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

describe('CollectionFilterDateRange', () => {
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
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(CollectionFilterDateRangeHost);
    await fixture.whenStable();
  });

  it('should open the popover when state changes to open, and mirror its own dismissal back through stateChanged', async () => {
    fixture.componentInstance.state.set('open');
    await fixture.whenStable();

    expect(document.querySelector('tbody[role="rowgroup"]')).not.toBeNull();

    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await fixture.whenStable();

    expect(fixture.componentInstance.lastState).toBe('closed');
    expect(document.querySelector('tbody[role="rowgroup"]')).toBeNull();
  });

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

  it('should render no visible or accessible trace of tooltip — CollectionFilterBar’s own chip owns the reason now', async () => {
    fixture.componentInstance.disabled.set(true);
    fixture.componentInstance.tooltip.set('Due range cannot be filtered on this view.');
    await fixture.whenStable();

    const button: HTMLButtonElement = trigger() as HTMLButtonElement;

    expect(button.getAttribute('aria-describedby')).toBeNull();
    expect(button.querySelector('[data-slot="field-description"]')).toBeNull();
    expect(button.textContent).not.toContain('Due range cannot be filtered on this view.');
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
});
