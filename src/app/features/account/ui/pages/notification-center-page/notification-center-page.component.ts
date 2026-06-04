import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SkeletonModule } from 'primeng/skeleton';
import type { NotificationOutput } from '@features/account/models';
import { NotificationStore } from '@features/account/state';
import { InfiniteScrollDirective } from '@shared/directives';

const TYPE_ICONS: Record<string, string> = {
  'user.created': 'pi-user-plus',
  'user.updated': 'pi-user-edit',
  'user.deleted': 'pi-user-minus',
  'user.invited': 'pi-user-plus',
  login: 'pi-sign-in',
  'login.failed': 'pi-lock',
  'password.reset': 'pi-key',
  security: 'pi-shield',
  'organization.created': 'pi-building',
  'organization.updated': 'pi-building',
  'organization.deleted': 'pi-trash',
  'member.added': 'pi-users',
  'member.removed': 'pi-users',
  maintenance: 'pi-wrench',
  update: 'pi-sync',
  upgrade: 'pi-arrow-circle-up',
  alert: 'pi-exclamation-triangle',
  error: 'pi-times-circle',
};

const CATEGORY_ICONS: Record<string, string> = {
  organization: 'pi-sitemap',
  system: 'pi-cog',
  security: 'pi-shield',
  user: 'pi-user',
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

/**
 * Component NotificationCenterPage
 * @class NotificationCenterPage
 *
 * @description
 * Full-page notification center. Lists all notifications for the
 * authenticated user, allows filtering by read/unread state, and
 * lets the user mark individual notifications as read.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-notification-center-page',
  imports: [DatePipe, ButtonModule, SkeletonModule, ProgressSpinnerModule, InfiniteScrollDirective],
  templateUrl: './notification-center-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationCenterPage implements OnInit {
  //#region Properties
  /**
   * Property notificationStore
   * @readonly
   *
   * @description
   * Signal store providing the current notification list,
   * loading state and actions.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {NotificationStore}
   */
  protected readonly notificationStore: NotificationStore =
    inject<NotificationStore>(NotificationStore);
  //#endregion

  //#region Methods
  /**
   * Method ngOnInit
   *
   * @description
    * Loads notification reference types when the component is initialised.
    * The initial notification list is bootstrapped globally via account
    * feature initializers to avoid duplicate startup requests.
   *
   * @access public
   * @since 1.0.0
   *
   * @returns {void}
   */
  public ngOnInit(): void {
    void this.notificationStore.initializeTypes();
  }

  /**
   * Method onMarkAsRead
   *
   * @description
   * Marks a single notification as read.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} id - Notification identifier.
   *
   * @returns {void} - No return value.
   */
  public onMarkAsRead(id: string): void {
    this.notificationStore.markAsRead(id);
  }

  /**
   * Method onLoadMore
   *
   * @description
   * Loads the next page of notifications (infinite scroll).
   *
   * @access public
   * @since 1.1.0
   *
   * @returns {void}
   */
  public onLoadMore(): void {
    this.notificationStore.loadMore();
  }

  /**
   * Method iconFor
   *
   * @description
   * Returns the PrimeIcons class for a notification's type/category.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {NotificationOutput} n
   * @returns {string}
   */
  public iconFor(n: NotificationOutput): string {
    return TYPE_ICONS[n.type] ?? CATEGORY_ICONS[n.category] ?? 'pi-bell';
  }

  /**
   * Method iconBgFor
   *
   * @description
   * Returns the Tailwind background class for a notification's category icon.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {NotificationOutput} n
   * @returns {string}
   */
  public iconBgFor(n: NotificationOutput): string {
    return CATEGORY_COLORS[n.category]?.bg ?? 'bg-surface-100';
  }

  /**
   * Method iconTextFor
   *
   * @description
   * Returns the Tailwind text-color class for a notification's category icon.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {NotificationOutput} n
   * @returns {string}
   */
  public iconTextFor(n: NotificationOutput): string {
    return CATEGORY_COLORS[n.category]?.text ?? 'text-surface-500';
  }
  //#endregion
}
