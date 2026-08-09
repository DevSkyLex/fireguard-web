import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  LOCALE_ID,
  model,
  type InputSignal,
  type ModelSignal,
  type Signal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronLeft, lucideChevronRight } from '@ng-icons/lucide';
import { HlmBadge } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import type { CalendarDisplayEvent } from '../../../models/calendar-display-event.interface';
import {
  buildCalendarMonth,
  toIsoDay,
  type CalendarMonthCell,
} from './utils/calendar-month/calendar-month.utils';

/**
 * How many chips a day cell shows before collapsing the rest into a "+N".
 */
const MAX_CHIPS_PER_DAY = 2;

/**
 * Component Calendar
 * @class Calendar
 *
 * @description
 * A generic month calendar of events — the shared widget ARCHITECTURE.md §2.7
 * names as a bare-noun concept: no feature import, generic inputs only.
 * Structure is Tailwind layout (a 7-column CSS grid); every interactive or
 * tonal element is a spartan primitive — `hlmBtn` for the month navigation
 * and the day cells, `hlm-badge` for the event chips.
 *
 * The calendar renders and selects; it does not interpret. Selecting a day
 * writes the two-way `selectedDay` model (`yyyy-MM-dd`), and the host decides
 * what a selected day shows. Chips are presentation only — one per event,
 * collapsed past two into a "+N" — so the cell button stays the single tab
 * stop per day (WCAG: one predictable target instead of a chip-by-chip
 * gauntlet).
 *
 * @version 1.0.0
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
  imports: [NgIcon, HlmBadge, HlmButton],
  providers: [provideIcons({ lucideChevronLeft, lucideChevronRight })],
  templateUrl: './calendar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Calendar {
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
   * @description The selected day as `yyyy-MM-dd`, or null; clicking a day writes it back.
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
  //#endregion

  //#region Properties
  /** The active locale, for the month and weekday labels. */
  private readonly locale: string = inject(LOCALE_ID);

  /** The month's weeks, rebuilt when the anchor moves. */
  protected readonly weeks: Signal<readonly (readonly CalendarMonthCell[])[]> = computed(() =>
    buildCalendarMonth(this.month(), new Date()),
  );

  /** The header's localized "Month Year" label. */
  protected readonly monthLabel: Signal<string> = computed<string>(() =>
    new Intl.DateTimeFormat(this.locale, { month: 'long', year: 'numeric' }).format(this.month()),
  );

  /** Monday-first localized weekday headers. */
  protected readonly weekdayLabels: Signal<readonly string[]> = computed<readonly string[]>(() => {
    const format = new Intl.DateTimeFormat(this.locale, { weekday: 'short' });

    // 2024-01-01 is a Monday; seven consecutive days give the localized headers.
    return Array.from({ length: 7 }, (unused, index) =>
      format.format(new Date(2024, 0, 1 + index)),
    );
  });

  /** Events grouped by their local ISO day. */
  private readonly eventsByDay: Signal<ReadonlyMap<string, readonly CalendarDisplayEvent[]>> =
    computed(() => {
      const grouped = new Map<string, CalendarDisplayEvent[]>();
      for (const event of this.events()) {
        const day: string = toIsoDay(new Date(event.date));
        const bucket: CalendarDisplayEvent[] = grouped.get(day) ?? [];
        bucket.push(event);
        grouped.set(day, bucket);
      }

      return grouped;
    });
  //#endregion

  //#region Methods
  /**
   * Method eventsOf
   * @description The chips shown inside a cell — at most {@link MAX_CHIPS_PER_DAY}.
   * @access protected
   * @since 1.0.0
   * @param {CalendarMonthCell} cell - The cell being rendered.
   * @returns {readonly CalendarDisplayEvent[]} The visible chips.
   */
  protected eventsOf(cell: CalendarMonthCell): readonly CalendarDisplayEvent[] {
    return (this.eventsByDay().get(cell.iso) ?? []).slice(0, MAX_CHIPS_PER_DAY);
  }

  /**
   * Method overflowOf
   * @description How many of the day's events the cell collapses into "+N".
   * @access protected
   * @since 1.0.0
   * @param {CalendarMonthCell} cell - The cell being rendered.
   * @returns {number} The hidden-event count, zero when everything fits.
   */
  protected overflowOf(cell: CalendarMonthCell): number {
    const total: number = this.eventsByDay().get(cell.iso)?.length ?? 0;

    return Math.max(0, total - MAX_CHIPS_PER_DAY);
  }

  /**
   * Method countOf
   * @description The day's total event count, for the cell's accessible label.
   * @access protected
   * @since 1.0.0
   * @param {CalendarMonthCell} cell - The cell being rendered.
   * @returns {number} The event count.
   */
  protected countOf(cell: CalendarMonthCell): number {
    return this.eventsByDay().get(cell.iso)?.length ?? 0;
  }

  /**
   * Method dayLabelOf
   * @description The cell's full localized date, for its accessible name.
   * @access protected
   * @since 1.0.0
   * @param {CalendarMonthCell} cell - The cell being rendered.
   * @returns {string} A full localized date.
   */
  protected dayLabelOf(cell: CalendarMonthCell): string {
    return new Intl.DateTimeFormat(this.locale, { dateStyle: 'full' }).format(
      new Date(`${cell.iso}T00:00:00`),
    );
  }

  /**
   * Method selectDay
   * @description Writes the picked day into the two-way model.
   * @access protected
   * @since 1.0.0
   * @param {CalendarMonthCell} cell - The picked cell.
   * @returns {void}
   */
  protected selectDay(cell: CalendarMonthCell): void {
    this.selectedDay.set(cell.iso);
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
   * @description Re-anchors on the current month and selects today.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected goToday(): void {
    const now: Date = new Date();
    this.month.set(new Date(now.getFullYear(), now.getMonth(), 1));
    this.selectedDay.set(toIsoDay(now));
  }
  //#endregion
}
