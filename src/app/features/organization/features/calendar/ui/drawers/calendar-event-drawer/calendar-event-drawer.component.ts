import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
} from '@angular/core';
import { DrawerModule, type DrawerPassThroughOptions } from 'primeng/drawer';
import {
  CalendarEventForm,
  type CalendarEventFormValues,
} from '@features/organization/features/calendar/ui/forms';

/**
 * Component CalendarEventDrawer
 * @class CalendarEventDrawer
 *
 * @description
 * Presentational right-side drawer hosting the {@link CalendarEventForm}.
 * Owns only the drawer shell — visibility, sizing and dismiss behaviour — and
 * re-emits the validated form values and visibility changes. All
 * orchestration (creating, toasts, refreshing the feed, closing on success)
 * stays with the parent page.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-calendar-event-drawer',
  imports: [DrawerModule, CalendarEventForm],
  templateUrl: './calendar-event-drawer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarEventDrawer {
  //#region Inputs
  /**
   * Property visible
   * @readonly
   *
   * @description
   * Whether the drawer is currently open.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly visible: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property loading
   * @readonly
   *
   * @description
   * Whether a create request is in flight; locks the form and the drawer.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly loading: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Outputs
  /**
   * Property visibleChange
   * @readonly
   *
   * @description
   * Emits the new visibility state when the drawer is opened or dismissed.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<boolean>}
   */
  public readonly visibleChange: OutputEmitterRef<boolean> = output<boolean>();

  /**
   * Property submitted
   * @readonly
   *
   * @description
   * Emits the validated event values when the hosted form is submitted.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<CalendarEventFormValues>}
   */
  public readonly submitted: OutputEmitterRef<CalendarEventFormValues> =
    output<CalendarEventFormValues>();
  //#endregion

  //#region Properties
  /**
   * Property drawerPt
   * @readonly
   *
   * @description
   * Drawer pass-through: full width on mobile, comfortable form width above.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {DrawerPassThroughOptions}
   */
  protected readonly drawerPt: DrawerPassThroughOptions = {
    root: { class: '!w-full sm:!w-[30rem]' },
  };
  //#endregion
}
