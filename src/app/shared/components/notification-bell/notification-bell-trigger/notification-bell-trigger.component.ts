import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { OverlayBadgeModule } from 'primeng/overlaybadge';

/**
 * Component NotificationBellTrigger
 * @class NotificationBellTrigger
 *
 * @description
 * Trigger button for the notification bell popover.
 * Renders a bell icon button with an optional unread-count
 * badge overlay. Emits {@link toggleMenu} when clicked so the
 * parent can position and toggle the popover.
 *
 * @since 2.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-notification-bell-trigger',
  imports: [ButtonModule, OverlayBadgeModule],
  templateUrl: './notification-bell-trigger.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationBellTrigger {
  //#region Inputs
  /**
   * Input hasUnread
   * @readonly
   *
   * @description
   * Whether the current user has at least one unread notification.
   * When true, a danger badge is shown on top of the bell icon.
   *
   * @access public
   * @since 2.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly hasUnread: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Outputs
  /**
   * Output toggleMenu
   * @readonly
   *
   * @description
   * Emitted when the trigger button is clicked.
   * The parent uses the event to toggle the popover.
   *
   * @access public
   * @since 2.0.0
   *
   * @type {OutputEmitterRef<MouseEvent>}
   */
  public readonly toggleMenu: OutputEmitterRef<MouseEvent> =
    output<MouseEvent>();
  //#endregion
}
