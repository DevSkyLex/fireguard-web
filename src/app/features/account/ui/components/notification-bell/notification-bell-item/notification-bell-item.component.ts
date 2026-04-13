import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
} from '@angular/core';
import type { NotificationOutput } from '@features/account/models';

const TYPE_ICONS: Record<string, string> = {
  // user
  'user.created': 'pi-user-plus',
  'user.updated': 'pi-user-edit',
  'user.deleted': 'pi-user-minus',
  'user.invited': 'pi-user-plus',
  // auth / security
  login: 'pi-sign-in',
  'login.failed': 'pi-lock',
  'password.reset': 'pi-key',
  security: 'pi-shield',
  // organization
  'organization.created': 'pi-building',
  'organization.updated': 'pi-building',
  'organization.deleted': 'pi-trash',
  'member.added': 'pi-users',
  'member.removed': 'pi-users',
  // system
  maintenance: 'pi-wrench',
  update: 'pi-sync',
  upgrade: 'pi-arrow-circle-up',
  alert: 'pi-exclamation-triangle',
  error: 'pi-times-circle',
};

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  organization: {
    bg: 'bg-indigo-100 dark:bg-indigo-950',
    text: 'text-indigo-600 dark:text-indigo-400',
  },
  system: { bg: 'bg-amber-100 dark:bg-amber-950', text: 'text-amber-600 dark:text-amber-400' },
  security: { bg: 'bg-red-100 dark:bg-red-950', text: 'text-red-600 dark:text-red-400' },
  user: { bg: 'bg-sky-100 dark:bg-sky-950', text: 'text-sky-600 dark:text-sky-400' },
};

const CATEGORY_ICONS: Record<string, string> = {
  organization: 'pi-sitemap',
  system: 'pi-cog',
  security: 'pi-shield',
  user: 'pi-user',
};

/**
 * Component NotificationBellItem
 * @class NotificationBellItem
 *
 * @description
 * Single notification row inside the bell popover list.
 * Displays a category icon circle, the notification subject,
 * a two-line body preview, the creation date and an interactive
 * mark-as-read dot for unread items.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-notification-bell-item',
  imports: [DatePipe],
  templateUrl: './notification-bell-item.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationBellItem {
  //#region Inputs
  /**
   * Input notification
   * @readonly
   *
   * @description
   * The notification data object to render. Required — the component
   * has no meaningful default state without a notification.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<NotificationOutput>}
   */
  public readonly notification: InputSignal<NotificationOutput> =
    input.required<NotificationOutput>();
  //#endregion

  //#region Outputs
  /**
   * Output markAsRead
   * @readonly
   *
   * @description
   * Emitted when the user clicks the unread dot to mark the notification
   * as read. The parent (list) is responsible for forwarding the
   * notification identifier to the store.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly markAsRead: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Computed
  /**
   * Computed icon
   * @readonly
   *
   * @description
   * Resolves the PrimeIcons class for the notification's type.
   * Falls back to the category icon, then to a generic bell icon.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly icon: Signal<string> = computed<string>(() => {
    const { type, category } = this.notification();
    return TYPE_ICONS[type] ?? CATEGORY_ICONS[category] ?? 'pi-bell';
  });

  /**
   * Computed iconBg
   * @readonly
   *
   * @description
   * Tailwind background-color class for the category icon circle,
   * derived from the notification's category. Defaults to a neutral surface.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly iconBg: Signal<string> = computed<string>(() => {
    return CATEGORY_COLORS[this.notification().category]?.bg ?? 'bg-surface-100';
  });

  /**
   * Computed iconText
   * @readonly
   *
   * @description
   * Tailwind text-color class for the icon itself inside the circle,
   * derived from the notification's category. Defaults to a neutral surface.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly iconText: Signal<string> = computed<string>(() => {
    return CATEGORY_COLORS[this.notification().category]?.text ?? 'text-surface-500';
  });
  //#endregion

  //#region Methods
  /**
   * Method onMarkAsRead
   * @method onMarkAsRead
   *
   * @description
   * Stops event propagation and emits the markAsRead output if the
   * notification is currently unread, preventing double-marking.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {MouseEvent} event - The click event on the unread dot button.
   *
   * @return {void} - No return value.
   */
  protected onMarkAsRead(event: MouseEvent): void {
    event.stopPropagation();
    if (!this.notification().isRead) {
      this.markAsRead.emit();
    }
  }
  //#endregion
}
