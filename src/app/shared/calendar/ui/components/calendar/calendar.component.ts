import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  Injector,
  input,
  linkedSignal,
  LOCALE_ID,
  model,
  viewChild,
  type InputSignal,
  type ModelSignal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronLeft, lucideChevronRight } from '@ng-icons/lucide';
import {
  BrnCalendarCell,
  BrnCalendarCellButton,
  BrnCalendarGrid,
  BrnCalendarHeader,
  BrnCalendarWeek,
  BrnCalendarWeekday,
  provideBrnCalendar,
  type BrnCalendarBase,
} from '@spartan-ng/brain/calendar';
import { HlmBadge } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import type { CalendarDisplayEvent } from '../../../models/calendar-display-event.interface';
import type { CalendarDaySummary } from './models/calendar-day-summary.interface';
import {
  buildCalendarMonthDays,
  startOfMonth,
  toIsoDay,
} from './utils/calendar-month/calendar-month.utils';

/**
 * How many chips a day cell shows before collapsing the rest into a "+N".
 */
const MAX_CHIPS_PER_DAY = 2;

/**
 * How many density dots the compact (phone) layout shows in place of chips.
 */
const MAX_DOTS_PER_DAY = 3;

/**
 * The summary shared by every day that carries no event.
 */
const EMPTY_DAY: CalendarDaySummary = { count: 0, chips: [], dots: [], overflow: 0 };

/**
 * A Sunday, so adding a JavaScript weekday index lands on that weekday.
 */
const WEEKDAY_REFERENCE = new Date(2024, 0, 7);

/**
 * Component Calendar
 * @class Calendar
 *
 * @description
 * A generic month calendar of events — a bare-noun shared concept
 * (ARCHITECTURE.md §2.7): no feature import, generic inputs only. It renders
 * and selects; it does not interpret. Selecting a day writes the two-way
 * `selectedDay` model (`yyyy-MM-dd`) and the host decides what that day shows.
 *
 * The grid is spartan's headless calendar rather than hand-rolled markup: the
 * component implements `BrnCalendarBase` and provides itself through
 * `provideBrnCalendar`, so `brnCalendarGrid`, `brnCalendarWeek` and
 * `brnCalendarCellButton` supply the WCAG grid pattern — `role="grid"`,
 * roving `tabindex`, arrow / Home / End / PageUp / PageDown navigation and
 * `aria-selected` — over this widget's own month model.
 *
 * The host may supply its own Today/prev/next chrome instead of this
 * widget's built-in one (`showToolbar`) — the month title stays in the DOM
 * either way, `sr-only` when hidden, because `brnCalendarGrid`'s
 * `aria-labelledby` always points at it: hiding the whole header would leave
 * the grid with no accessible name.
 *
 * @version 2.1.0
 *
 * @example
 * ```html
 * <app-calendar [(month)]="month" [(selectedDay)]="selectedDay" [events]="events()" />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-calendar',
  imports: [
    NgIcon,
    HlmBadge,
    HlmButton,
    BrnCalendarCell,
    BrnCalendarCellButton,
    BrnCalendarGrid,
    BrnCalendarHeader,
    BrnCalendarWeek,
    BrnCalendarWeekday,
  ],
  providers: [
    provideIcons({ lucideChevronLeft, lucideChevronRight }),
    provideBrnCalendar(Calendar),
  ],
  templateUrl: './calendar.component.html',
  host: { class: 'block min-h-0 w-full' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Calendar implements BrnCalendarBase<Date> {
  //#region Inputs
  /**
   * Property month
   * @readonly
   * @description Any date inside the displayed month; navigation writes it back.
   * @access public
   * @since 1.0.0
   * @type {ModelSignal<Date>}
   */
  public readonly month: ModelSignal<Date> = model<Date>(new Date());

  /**
   * Property selectedDay
   * @readonly
   * @description The selected day as `yyyy-MM-dd`, or null; picking a day writes it back.
   * @access public
   * @since 1.0.0
   * @type {ModelSignal<string | null>}
   */
  public readonly selectedDay: ModelSignal<string | null> = model<string | null>(null);

  /**
   * Property events
   * @readonly
   * @description Every chip to place on the grid, in the generic display shape.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly CalendarDisplayEvent[]>}
   */
  public readonly events: InputSignal<readonly CalendarDisplayEvent[]> = input<
    readonly CalendarDisplayEvent[]
  >([]);

  /**
   * Property highlightDays
   * @readonly
   * @description Days spartan marks with `data-highlighted`; part of the `BrnCalendarBase` contract.
   * @access public
   * @since 2.0.0
   * @type {InputSignal<Date[]>}
   */
  public readonly highlightDays: InputSignal<Date[]> = input<Date[]>([]);

  /**
   * Property showToolbar
   * @readonly
   *
   * @description
   * Whether this widget renders its own Today/prev/next controls. A host
   * that supplies its own toolbar band sets this `false`; the month title
   * stays in the DOM regardless (see class doc), so the grid keeps an
   * accessible name.
   *
   * @access public
   * @since 2.1.0
   * @type {InputSignal<boolean>}
   */
  public readonly showToolbar: InputSignal<boolean> = input<boolean>(true);
  //#endregion

  //#region Properties
  /** The active locale, for the month, weekday and day labels. */
  private readonly locale: string = inject(LOCALE_ID);

  /** Resolves the deferred focus move after a keyboard navigation. */
  private readonly injector: Injector = inject(Injector);

  /** The cells spartan registers, so the focused day can be focused for real. */
  private readonly cells: BrnCalendarCellButton<Date>[] = [];

  /** Today's local day, resolved once so the grid cannot shift mid-session. */
  protected readonly todayIso: string = toIsoDay(new Date());

  /** The header's localized "Month Year" label. */
  protected readonly monthLabel: Signal<string> = computed<string>(() =>
    new Intl.DateTimeFormat(this.locale, { month: 'long', year: 'numeric' }).format(this.month()),
  );

  /** What each day of the grid renders, keyed by its ISO day. */
  private readonly summaries: Signal<ReadonlyMap<string, CalendarDaySummary>> = computed(() => {
    const grouped = new Map<string, CalendarDisplayEvent[]>();
    for (const event of this.events()) {
      const day: string = toIsoDay(new Date(event.date));
      const bucket: CalendarDisplayEvent[] = grouped.get(day) ?? [];
      bucket.push(event);
      grouped.set(day, bucket);
    }

    const summaries = new Map<string, CalendarDaySummary>();
    for (const [day, bucket] of grouped) {
      summaries.set(day, {
        count: bucket.length,
        chips: bucket.slice(0, MAX_CHIPS_PER_DAY),
        dots: Array.from({ length: Math.min(bucket.length, MAX_DOTS_PER_DAY) }, (unused, i) => i),
        overflow: Math.max(0, bucket.length - MAX_CHIPS_PER_DAY),
      });
    }

    return summaries;
  });
  //#endregion

  //#region Spartan calendar contract
  /**
   * Property days
   * @readonly
   * @description The displayed month's days plus its fillers; `brnCalendarWeek` chunks them into rows.
   * @access public
   * @since 2.0.0
   * @type {Signal<Date[]>}
   */
  public readonly days: Signal<Date[]> = computed<Date[]>(() =>
    buildCalendarMonthDays(this.month()),
  );

  /**
   * Property focusedDate
   *
   * @description
   * The grid's roving-focus anchor — the one day reachable by Tab. It follows
   * the month, keeping the day the user had focused whenever that day still
   * belongs to the month being shown.
   *
   * @readonly
   * @access public
   * @since 2.0.0
   * @type {WritableSignal<Date>}
   */
  public readonly focusedDate: WritableSignal<Date> = linkedSignal<number, Date>({
    source: () => startOfMonth(this.month()).getTime(),
    computation: (monthTime, previous) => {
      const focused: Date | undefined = previous?.value;

      return focused !== undefined && startOfMonth(focused).getTime() === monthTime
        ? focused
        : new Date(monthTime);
    },
  });

  /**
   * Property header
   * @readonly
   * @description The month title spartan points the grid's `aria-labelledby` at.
   * @access public
   * @since 2.0.0
   * @type {Signal<BrnCalendarHeader | undefined>}
   */
  public readonly header: Signal<BrnCalendarHeader | undefined> = viewChild(BrnCalendarHeader);

  /**
   * Property disabled
   * @readonly
   * @description Never disabled: the widget browses a month, it does not gate picking one.
   * @access public
   * @since 2.0.0
   * @type {Signal<boolean>}
   */
  public readonly disabled: Signal<boolean> = computed<boolean>(() => false);

  /**
   * Method isSelected
   * @description Whether a day carries the current selection.
   * @access public
   * @since 2.0.0
   * @param {Date} date - The day in question.
   * @returns {boolean} True when the day is selected.
   */
  public isSelected(date: Date): boolean {
    return toIsoDay(date) === this.selectedDay();
  }

  /**
   * Method selectDate
   * @description Writes the picked day into the two-way model and anchors focus on it.
   * @access public
   * @since 2.0.0
   * @param {Date} date - The picked day.
   * @returns {void}
   */
  public selectDate(date: Date): void {
    this.selectedDay.set(toIsoDay(date));
    this.anchorOn(date);
  }

  /**
   * Method setFocusedDate
   * @description Moves the roving anchor and the real DOM focus, after a keyboard navigation.
   * @access public
   * @since 2.0.0
   * @param {Date} date - The day to focus.
   * @returns {void}
   */
  public setFocusedDate(date: Date): void {
    this.anchorOn(date);

    afterNextRender(
      {
        write: (): void => {
          const iso: string = toIsoDay(date);
          this.cells.find((cell) => toIsoDay(cell.date()) === iso)?.focus();
        },
      },
      { injector: this.injector },
    );
  }

  /**
   * Method constrainDate
   * @description No bounds are enforced, so every day stands as given.
   * @access public
   * @since 2.0.0
   * @param {Date} date - The day in question.
   * @returns {Date} The same day.
   */
  public constrainDate(date: Date): Date {
    return date;
  }

  /**
   * Method isDateDisabled
   * @description No day is ever disabled on a browsing grid.
   * @access public
   * @since 2.0.0
   * @returns {boolean} Always false.
   */
  public isDateDisabled(): boolean {
    return false;
  }

  /**
   * Method isStartOfRange
   * @description The grid selects a single day, so no day starts a range.
   * @access public
   * @since 2.0.0
   * @returns {boolean} Always false.
   */
  public isStartOfRange(): boolean {
    return false;
  }

  /**
   * Method isEndOfRange
   * @description The grid selects a single day, so no day ends a range.
   * @access public
   * @since 2.0.0
   * @returns {boolean} Always false.
   */
  public isEndOfRange(): boolean {
    return false;
  }

  /**
   * Method isBetweenRange
   * @description The grid selects a single day, so no day sits inside a range.
   * @access public
   * @since 2.0.0
   * @returns {boolean} Always false.
   */
  public isBetweenRange(): boolean {
    return false;
  }

  /**
   * Method registerCalendarCell
   * @description Tracks a rendered cell so the focused day can be focused for real.
   * @access public
   * @since 2.0.0
   * @param {BrnCalendarCellButton<Date>} cell - The cell entering the grid.
   * @returns {void}
   */
  public registerCalendarCell(cell: BrnCalendarCellButton<Date>): void {
    this.cells.push(cell);
  }

  /**
   * Method unregisterCalendarCell
   * @description Drops a cell that has left the grid.
   * @access public
   * @since 2.0.0
   * @param {BrnCalendarCellButton<Date>} cell - The cell leaving the grid.
   * @returns {void}
   */
  public unregisterCalendarCell(cell: BrnCalendarCellButton<Date>): void {
    const index: number = this.cells.indexOf(cell);
    if (index !== -1) this.cells.splice(index, 1);
  }
  //#endregion

  //#region Methods
  /**
   * Method summaryOf
   * @description What a day cell renders, or the empty summary when nothing falls on it.
   * @access protected
   * @since 2.0.0
   * @param {string} iso - The cell's `yyyy-MM-dd` day.
   * @returns {CalendarDaySummary} The day's chips, dots and counts.
   */
  protected summaryOf(iso: string): CalendarDaySummary {
    return this.summaries().get(iso) ?? EMPTY_DAY;
  }

  /**
   * Method isoOf
   * @description A grid day as its local `yyyy-MM-dd` key.
   * @access protected
   * @since 2.0.0
   * @param {Date} date - The day being rendered.
   * @returns {string} The ISO day.
   */
  protected isoOf(date: Date): string {
    return toIsoDay(date);
  }

  /**
   * Method dayLabelOf
   * @description A day's full localized date, opening the cell's accessible name.
   * @access protected
   * @since 1.0.0
   * @param {Date} date - The day being rendered.
   * @returns {string} A full localized date.
   */
  protected dayLabelOf(date: Date): string {
    return new Intl.DateTimeFormat(this.locale, { dateStyle: 'full' }).format(date);
  }

  /**
   * Method shortWeekdayOf
   * @description The abbreviated localized name of a weekday index.
   * @access protected
   * @since 2.0.0
   * @param {number} weekday - A JavaScript weekday index, Sunday being zero.
   * @returns {string} The short weekday name.
   */
  protected shortWeekdayOf(weekday: number): string {
    return this.weekdayName(weekday, 'short');
  }

  /**
   * Method longWeekdayOf
   * @description The full localized name of a weekday index, for the column header.
   * @access protected
   * @since 2.0.0
   * @param {number} weekday - A JavaScript weekday index, Sunday being zero.
   * @returns {string} The full weekday name.
   */
  protected longWeekdayOf(weekday: number): string {
    return this.weekdayName(weekday, 'long');
  }

  /**
   * Method stepMonth
   * @description Moves the anchor one month backwards or forwards.
   * @access protected
   * @since 1.0.0
   * @param {number} offset - `-1` or `1`.
   * @returns {void}
   */
  protected stepMonth(offset: number): void {
    const current: Date = this.month();
    this.month.set(new Date(current.getFullYear(), current.getMonth() + offset, 1));
  }

  /**
   * Method goToday
   * @description Re-anchors on the current month and selects today, without stealing focus.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected goToday(): void {
    this.selectDate(new Date());
  }

  /**
   * Method anchorOn
   *
   * @description
   * Points the roving anchor at a day, pulling the displayed month along when
   * the day sits outside it. The anchor is written first so the month's
   * `linkedSignal` recomputation keeps it rather than resetting to the first.
   *
   * @access private
   * @since 2.0.0
   *
   * @param {Date} date - The day to anchor on.
   *
   * @returns {void}
   */
  private anchorOn(date: Date): void {
    this.focusedDate.set(date);

    const target: Date = startOfMonth(date);
    if (target.getTime() !== startOfMonth(this.month()).getTime()) this.month.set(target);
  }

  /**
   * Method weekdayName
   * @description A weekday index rendered in the active locale at the asked width.
   * @access private
   * @since 2.0.0
   * @param {number} weekday - A JavaScript weekday index, Sunday being zero.
   * @param {'short' | 'long'} width - How wide the name should be.
   * @returns {string} The localized weekday name.
   */
  private weekdayName(weekday: number, width: 'short' | 'long'): string {
    const day: Date = new Date(WEEKDAY_REFERENCE);
    day.setDate(day.getDate() + weekday);

    return new Intl.DateTimeFormat(this.locale, { weekday: width }).format(day);
  }
  //#endregion
}
