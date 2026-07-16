import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  type WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { Events } from '@ngrx/signals/events';
import { AvatarModule } from 'primeng/avatar';
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
 * Account row rendered in the dashboard sidebar footer (avatar, display
 * name, email) that expands an inline panel upward inside the sidebar with
 * the account sections (Profile, Security, Notifications) and a Logout
 * action. The panel animates open via a CSS grid-rows transition and the
 * Notifications entry shows the unread count as a badge.
 *
 * Subscribes to `authStoreEvents.logoutSucceeded` and
 * `authStoreEvents.logoutFailed` to redirect to `/auth/login` after logout.
 *
 * @version 2.0.0
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
  imports: [AvatarModule, RouterLink, SkeletonModule],
  templateUrl: './account-user-menu.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountUserMenu {
  //#region Properties
  /**
   * Property nextInstanceId
   * @static
   *
   * @description
   * Monotonic counter making each rendered instance's panel id unique —
   * the sidebar (and its mobile drawer twin) can coexist in the DOM.
   *
   * @access private
   * @since 2.0.0
   *
   * @type {number}
   */
  private static nextInstanceId: number = 0;

  /**
   * Property panelId
   * @readonly
   *
   * @description
   * Unique id of the expandable panel, referenced by the trigger's
   * `aria-controls`.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {string}
   */
  protected readonly panelId: string = `account-user-menu-panel-${AccountUserMenu.nextInstanceId++}`;

  /**
   * Property expanded
   * @readonly
   *
   * @description
   * Whether the inline account panel is expanded above the trigger row.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly expanded: WritableSignal<boolean> = signal<boolean>(false);

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
   * surface the unread count as a badge on the Notifications entry.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {NotificationCenterPort}
   */
  protected readonly notificationCenter: NotificationCenterPort =
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
   * Method togglePanel
   * @method togglePanel
   *
   * @description
   * Toggles the inline account panel open or closed.
   *
   * @access protected
   * @since 2.0.0
   *
   * @returns {void} - This method does not return a value.
   */
  protected togglePanel(): void {
    this.expanded.update((expanded: boolean) => !expanded);
  }

  /**
   * Method closePanel
   * @method closePanel
   *
   * @description
   * Collapses the inline account panel, called after activating an entry.
   *
   * @access protected
   * @since 2.0.0
   *
   * @returns {void} - This method does not return a value.
   */
  protected closePanel(): void {
    this.expanded.set(false);
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
