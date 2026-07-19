import { DatePipe, NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
  type TemplateRef,
} from '@angular/core';
import type { TagSeverity } from '../../../tag';
import type { CalendarDay, CalendarEvent, CalendarEventContext } from '../../models';

/**
 * Soft chip classes (tinted background + ink text) per severity, applied to a
 * month-cell event chip so the whole chip carries its semantic colour. Each
 * value is a complete literal string so Tailwind's content scanner keeps the
 * utilities.
 */
const CHIP_TONE_CLASS: Record<TagSeverity, string> = {
  success: 'bg-green-50 text-green-700 dark:bg-green-400/10 dark:text-green-300',
  info: 'bg-blue-50 text-blue-700 dark:bg-blue-400/10 dark:text-blue-300',
  warn: 'bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300',
  danger: 'bg-red-50 text-red-700 dark:bg-red-400/10 dark:text-red-300',
  secondary: 'bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-300',
  contrast: 'bg-surface-200 text-surface-800 dark:bg-surface-700 dark:text-surface-100',
};

/**
 * Component CalendarMonth
 * @class CalendarMonth
 *
 * @description
 * Presentational month grid: a weekday header and 6×7 day cells rendering each
 * day's events through the caller-supplied event template, with a "+N more"
 * affordance that asks to open the day. Emits event, create and day-select
 * intents; owns no state.
 *
 * @version 1.1.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-calendar-month',
  imports: [DatePipe, NgTemplateOutlet],
  templateUrl: './calendar-month.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarMonth {
  /**
   * Builds the localized "Open <title>" accessibility label for an event.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} title - Event title.
   * @returns {string} Localized aria-label.
   */
  protected openLabel(title: string): string {
    return $localize`:@@calendar.openEvent:Open ${title}:title:`;
  }

  //#region Inputs
  /**
   * Property days
   * @readonly
   *
   * @description
   * Ordered 42 day cells (6×7 grid) to render.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly CalendarDay[]>}
   */
  public readonly days: InputSignal<readonly CalendarDay[]> =
    input.required<readonly CalendarDay[]>();

  /**
   * Property weekdayLabels
   * @readonly
   *
   * @description
   * Weekday header labels, already ordered for the configured week start.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly string[]>}
   */
  public readonly weekdayLabels: InputSignal<readonly string[]> =
    input.required<readonly string[]>();

  /**
   * Property maxEventsPerDay
   * @readonly
   *
   * @description
   * Maximum event chips shown per cell before the "+N more" affordance.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<number>}
   */
  public readonly maxEventsPerDay: InputSignal<number> = input<number>(3);

  /**
   * Property eventTemplate
   * @readonly
   *
   * @description
   * Template rendering a single event chip; receives the event through
   * {@link CalendarEventContext}.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<TemplateRef<CalendarEventContext> | null>}
   */
  public readonly eventTemplate: InputSignal<TemplateRef<CalendarEventContext> | null> =
    input<TemplateRef<CalendarEventContext> | null>(null);
  //#endregion

  //#region Outputs
  /**
   * Property eventClick
   * @readonly
   *
   * @description
   * Emits the clicked event.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<CalendarEvent>}
   */
  public readonly eventClick: OutputEmitterRef<CalendarEvent> = output<CalendarEvent>();

  /**
   * Property dayCreate
   * @readonly
   *
   * @description
   * Emits the day whose "+" create affordance was used.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<Date>}
   */
  public readonly dayCreate: OutputEmitterRef<Date> = output<Date>();

  /**
   * Property daySelect
   * @readonly
   *
   * @description
   * Emits a day to open in detail (from the "+N more" affordance).
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<Date>}
   */
  public readonly daySelect: OutputEmitterRef<Date> = output<Date>();
  //#endregion

  //#region Methods
  /**
   * Method visibleEvents
   *
   * @description
   * The capped list of events shown directly in a day cell.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {CalendarDay} day - Day cell.
   * @returns {readonly CalendarEvent[]} Up to {@link maxEventsPerDay} events.
   */
  protected visibleEvents(day: CalendarDay): readonly CalendarEvent[] {
    return day.events.slice(0, this.maxEventsPerDay());
  }

  /**
   * Method overflowCount
   *
   * @description
   * Number of events hidden behind the "+N more" affordance for a day.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {CalendarDay} day - Day cell.
   * @returns {number} Hidden event count (0 when none).
   */
  protected overflowCount(day: CalendarDay): number {
    return Math.max(0, day.events.length - this.maxEventsPerDay());
  }

  /**
   * Method chipClass
   *
   * @description
   * Soft semantic chip classes (tinted background + ink text) for an event,
   * falling back to the neutral `secondary` tone when the event carries none.
   *
   * @access protected
   * @since 1.1.0
   *
   * @param {CalendarEvent} event - Event rendered as a chip.
   * @returns {string} Tailwind background/text utility classes for the chip.
   */
  protected chipClass(event: CalendarEvent): string {
    return CHIP_TONE_CLASS[event.tone ?? 'secondary'];
  }

  /**
   * Method cellClass
   *
   * @description
   * Background variant of a day cell: accent-soft for today, muted chrome for
   * adjacent-month cells, a lighter chrome wash for in-month weekends, and no
   * extra background otherwise.
   *
   * @access protected
   * @since 1.1.0
   *
   * @param {CalendarDay} day - Day cell to style.
   * @returns {string} Tailwind background utility classes for the cell.
   */
  protected cellClass(day: CalendarDay): string {
    if (day.isToday) return 'bg-primary-50 dark:bg-primary-400/15';
    if (!day.inMonth) return 'bg-surface-50 dark:bg-surface-950/40';
    const weekday: number = day.date.getDay();
    if (weekday === 0 || weekday === 6) return 'bg-surface-50/60 dark:bg-surface-950/25';
    return '';
  }
  //#endregion
}
