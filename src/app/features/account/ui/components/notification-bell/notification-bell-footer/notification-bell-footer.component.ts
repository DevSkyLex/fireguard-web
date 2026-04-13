import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';

/**
 * Component NotificationBellFooter
 * @class NotificationBellFooter
 *
 * @description
 * Footer bar of the notification bell popover.
 * Provides a "Mark all as read" action button (visible only when
 * there are unread items) and a navigation link to the full
 * notification center page.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-notification-bell-footer',
  imports: [RouterLink, ButtonModule],
  templateUrl: './notification-bell-footer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationBellFooter {
  //#region Inputs
  /**
   * Input hasUnread
   * @readonly
   *
   * @description
   * Whether the current user has at least one unread notification.
   * Controls the visibility of the "Mark all as read" button.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly hasUnread: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Outputs
  /**
   * Output markAllAsRead
   * @readonly
   *
   * @description
   * Emitted when the user clicks the "Mark all as read" button.
   * The root bell component is responsible for dispatching the
   * corresponding store action.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly markAllAsRead: OutputEmitterRef<void> = output<void>();
  //#endregion
}
