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
import { ButtonModule } from 'primeng/button';
import type { CalendarAgendaDay, CalendarEvent, CalendarEventContext } from '../../models';
import { addDays, isSameDay, startOfDay } from '../../utils';

/**
 * Component CalendarAgenda
 * @class CalendarAgenda
 *
 * @description
 * Presentational agenda list: sticky dated day headers with a relative
 * "Today"/"Tomorrow" cue and a per-day create affordance, followed by timeline
 * rows. The agenda owns the temporal chrome (a left time gutter showing each
 * event's start/end, or an "all-day" marker) while the event body itself is
 * rendered through the caller-supplied template. Emits event and create intents;
 * owns no state.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-calendar-agenda',
  imports: [ButtonModule, DatePipe, NgTemplateOutlet],
  templateUrl: './calendar-agenda.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarAgenda {
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
   * Property agendaDays
   * @readonly
   *
   * @description
   * Dated day groups in ascending order (events pre-sorted all-day first).
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly CalendarAgendaDay[]>}
   */
  public readonly agendaDays: InputSignal<readonly CalendarAgendaDay[]> =
    input.required<readonly CalendarAgendaDay[]>();

  /**
   * Property today
   * @readonly
   *
   * @description
   * Current local day, used to surface the "Today"/"Tomorrow" cue on day headers.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<Date>}
   */
  public readonly today: InputSignal<Date> = input<Date>(startOfDay(new Date()));

  /**
   * Property eventTemplate
   * @readonly
   *
   * @description
   * Template rendering a single event body; receives the event through
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
   * Emits the day whose create affordance was used.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<Date>}
   */
  public readonly dayCreate: OutputEmitterRef<Date> = output<Date>();
  //#endregion

  //#region Methods
  /**
   * Method relativeLabel
   *
   * @description
   * Resolves a short relative cue for a day header, or `null` when the day is
   * neither today nor tomorrow.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {Date} date - Day being grouped.
   * @returns {string | null} `'Today'`, `'Tomorrow'`, or `null`.
   */
  protected relativeLabel(date: Date): string | null {
    const today: Date = this.today();
    if (isSameDay(date, today)) return 'Today';
    if (isSameDay(date, addDays(today, 1))) return 'Tomorrow';
    return null;
  }

  /**
   * Method isToday
   *
   * @description
   * Whether a grouped day is the current local day.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {Date} date - Day being grouped.
   * @returns {boolean} `true` when the day is today.
   */
  protected isToday(date: Date): boolean {
    return isSameDay(date, this.today());
  }

  /**
   * Method isAllDay
   *
   * @description
   * Whether an event spans the whole day (rendered with an "all-day" marker
   * instead of a clock time).
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {CalendarEvent} event - Event being rendered.
   * @returns {boolean} `true` when the event is all-day.
   */
  protected isAllDay(event: CalendarEvent): boolean {
    return event.allDay === true;
  }

  /**
   * Method endTime
   *
   * @description
   * The end instant to show beneath the start time, or `null` when there is no
   * meaningful end on the same day (all-day, missing, or not after the start).
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {CalendarEvent} event - Event being rendered.
   * @returns {Date | null} End instant to display, or `null`.
   */
  protected endTime(event: CalendarEvent): Date | null {
    if (event.allDay === true || !event.end) return null;
    if (!isSameDay(event.end, event.start)) return null;
    return event.end.getTime() > event.start.getTime() ? event.end : null;
  }
  //#endregion
}
