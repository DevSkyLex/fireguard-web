import { ChangeDetectionStrategy, Component, input, type InputSignal } from '@angular/core';

/**
 * Component NotificationBellHeader
 * @class NotificationBellHeader
 *
 * @description
 * Header section of the notification bell popover.
 * Displays the panel title and an unread-count badge pill
 * when at least one unread notification is present.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-notification-bell-header',
  templateUrl: './notification-bell-header.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationBellHeader {
  //#region Inputs
  /**
   * Input hasUnread
   * @readonly
   *
   * @description
   * Whether the current user has at least one unread notification.
   * Controls the visibility of the unread-count badge.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly hasUnread: InputSignal<boolean> = input<boolean>(false);

  /**
   * Input unreadCount
   * @readonly
   *
   * @description
   * Total number of unread notifications to display inside the badge.
   * Only rendered when {@link hasUnread} is true.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<number>}
   */
  public readonly unreadCount: InputSignal<number> = input<number>(0);
  //#endregion
}
