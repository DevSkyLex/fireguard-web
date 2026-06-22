import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  viewChild,
  type Signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Events } from '@ngrx/signals/events';
import type { MenuItem } from 'primeng/api';
import { AvatarModule } from 'primeng/avatar';
import { DividerModule } from 'primeng/divider';
import { Menu, MenuModule } from 'primeng/menu';
import { SkeletonModule } from 'primeng/skeleton';
import {
  NOTIFICATION_CENTER_PORT,
  USER_IDENTITY_PORT,
  type NotificationCenterPort,
  type UserIdentityPort,
} from '@features/account/ports';
import { AUTH_LOGOUT_PORT, authStoreEvents, type AuthLogoutPort } from '@features/auth';

/**
 * Component AccountUserMenu
 * @class AccountUserMenu
 *
 * @description
 * Compact avatar button rendered in the dashboard header (far-right slot)
 * that opens a PrimeNG Menu popup with the account sections (Profile,
 * Security, Notifications) and a Logout action. The Notifications entry shows
 * the unread count as a badge.
 *
 * Subscribes to `authStoreEvents.logoutSucceeded` and
 * `authStoreEvents.logoutFailed` to redirect to `/auth/login` after logout.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-account-user-menu />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-account-user-menu',
  imports: [AvatarModule, DividerModule, MenuModule, SkeletonModule],
  templateUrl: './account-user-menu.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountUserMenu {
  //#region Properties
  /**
   * Property menu
   * @readonly
   *
   * @description
   * Reference to the PrimeNG popup Menu used by the avatar trigger.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Signal<Menu>}
   */
  private readonly menu: Signal<Menu> = viewChild.required<Menu>('actionMenu');

  /**
   * Property userIdentityPort
   * @readonly
   *
   * @description
   * Port providing access to the authenticated user's identity
   * (avatar, initials, display name, email, loading state).
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {UserIdentityPort}
   */
  protected readonly userIdentityPort: UserIdentityPort =
    inject<UserIdentityPort>(USER_IDENTITY_PORT);

  /**
   * Property authLogoutPort
   * @readonly
   *
   * @description
   * Port providing logout state and triggering logout without coupling
   * the component to the concrete AuthStore.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {AuthLogoutPort}
   */
  protected readonly authLogoutPort: AuthLogoutPort = inject<AuthLogoutPort>(AUTH_LOGOUT_PORT);

  /**
   * Property notificationCenter
   * @readonly
   *
   * @description
   * Port exposing the authenticated user's notification center state, used to
   * surface the unread count as a badge on the Notifications menu entry.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {NotificationCenterPort}
   */
  private readonly notificationCenter: NotificationCenterPort =
    inject<NotificationCenterPort>(NOTIFICATION_CENTER_PORT);

  /**
   * Property router
   * @readonly
   *
   * @description
   * Angular Router used to navigate to the login page after logout.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Router}
   */
  private readonly router: Router = inject<Router>(Router);

  /**
   * Property events
   * @readonly
   *
   * @description
   * NgRx Signals event bus for reacting to auth lifecycle events.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Events}
   */
  private readonly events: Events = inject<Events>(Events);

  /**
   * Property menuItems
   * @readonly
   *
   * @description
   * Reactive list of PrimeNG `MenuItem` entries shown in the popup.
   * The Logout label and disabled state react to `authStore.isLoggingOut()`.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<MenuItem[]>}
   */
  protected readonly menuItems: Signal<MenuItem[]> = computed<MenuItem[]>((): MenuItem[] => {
    const unreadBadge: string | undefined = this.notificationCenter.hasUnread()
      ? String(this.notificationCenter.unreadCount())
      : undefined;

    return [
      {
        label: $localize`:@@account.menu.profile:Profile`,
        icon: 'pi pi-user',
        routerLink: '/account',
        queryParams: { tab: 'profile' },
        data: { testid: 'header-user-menu-profile-link' },
      },
      {
        label: $localize`:@@account.menu.security:Security`,
        icon: 'pi pi-shield',
        routerLink: '/account',
        queryParams: { tab: 'security' },
        data: { testid: 'header-user-menu-security' },
      },
      {
        label: $localize`:@@common.notifications:Notifications`,
        icon: 'pi pi-bell',
        routerLink: '/account',
        queryParams: { tab: 'notifications' },
        badge: unreadBadge,
        data: { testid: 'header-user-menu-notifications' },
      },
      { separator: true },
      {
        label: this.authLogoutPort.isLoggingOut()
          ? $localize`:@@auth.userProfile.loggingOut:Logging out...`
          : $localize`:@@auth.userProfile.logout:Logout`,
        icon: 'pi pi-sign-out',
        disabled: this.authLogoutPort.isLoggingOut(),
        command: (): void => this.onLogout(),
        data: { testid: 'header-user-menu-logout' },
      },
    ];
  });
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Subscribes to auth logout events to redirect to the login page.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    this.events
      .on(authStoreEvents.logoutSucceeded)
      .pipe(takeUntilDestroyed())
      .subscribe((): void => {
        this.router.navigate(['/auth/login']).catch((): undefined => undefined);
      });

    this.events
      .on(authStoreEvents.logoutFailed)
      .pipe(takeUntilDestroyed())
      .subscribe((): void => {
        this.router.navigate(['/auth/login']).catch((): undefined => undefined);
      });
  }
  //#endregion

  //#region Methods
  /**
   * Method toggleMenu
   * @method toggleMenu
   *
   * @description
   * Delegates the click event to the PrimeNG Menu to toggle the popup.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {MouseEvent} event - The click event from the avatar button.
   * @returns {void}
   */
  protected toggleMenu(event: MouseEvent): void {
    this.menu().toggle(event);
  }

  /**
   * Method onLogout
   * @method onLogout
   *
   * @description
   * Triggers the logout action on the auth store, guarded by the
   * `isLoggingOut` flag to prevent duplicate calls.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void} - This method does not return a value.
   */
  protected onLogout(): void {
    if (this.authLogoutPort.isLoggingOut()) return;
    this.authLogoutPort.logout();
  }
  //#endregion
}
