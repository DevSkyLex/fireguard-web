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
import type { CalendarDay, CalendarEvent, CalendarEventContext } from '../../models';

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
 * @version 1.0.0
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
  //#endregion
}
