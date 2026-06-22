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
import type {
  CalendarEvent,
  CalendarEventContext,
  CalendarTimedEvent,
  CalendarWeekDay,
} from '../../models';

/**
 * Component CalendarWeek
 * @class CalendarWeek
 *
 * @description
 * Presentational week time-grid: a day-header row, an all-day row, and a
 * scrollable body of seven day columns with an hour gutter. Timed events are
 * positioned by the percentage offsets resolved upstream and split into lanes
 * when they overlap. Emits event and create intents; owns no state.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-calendar-week',
  imports: [DatePipe, NgTemplateOutlet],
  templateUrl: './calendar-week.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarWeek {
  //#region Inputs
  /**
   * Property weekDays
   * @readonly
   *
   * @description
   * The seven day columns to render.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly CalendarWeekDay[]>}
   */
  public readonly weekDays: InputSignal<readonly CalendarWeekDay[]> =
    input.required<readonly CalendarWeekDay[]>();

  /**
   * Property hours
   * @readonly
   *
   * @description
   * Hour marks labelling the gutter (one per visible slot).
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly number[]>}
   */
  public readonly hours: InputSignal<readonly number[]> = input.required<readonly number[]>();

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
   * Emits the day whose column or "+" affordance was used to create.
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
   * Method laneLeft
   *
   * @description
   * Left offset (percentage) of a timed event within its day column.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {CalendarTimedEvent} timed - Positioned event.
   * @returns {number} Left offset as a percentage of the column width.
   */
  protected laneLeft(timed: CalendarTimedEvent): number {
    return (timed.lane / timed.laneCount) * 100;
  }

  /**
   * Method laneWidth
   *
   * @description
   * Width (percentage) of a timed event within its day column.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {CalendarTimedEvent} timed - Positioned event.
   * @returns {number} Width as a percentage of the column width.
   */
  protected laneWidth(timed: CalendarTimedEvent): number {
    return 100 / timed.laneCount;
  }
  //#endregion
}
