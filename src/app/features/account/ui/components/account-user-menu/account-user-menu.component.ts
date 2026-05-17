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
import { USER_IDENTITY_PORT, type UserIdentityPort } from '@features/account/ports';
import { AUTH_LOGOUT_PORT, authStoreEvents, type AuthLogoutPort } from '@features/auth';

/**
 * Component AccountUserMenu
 * @class AccountUserMenu
 *
 * @description
 * Compact avatar button rendered in the dashboard header (far-right slot)
 * that opens a PrimeNG Menu popup with user actions: Settings and Logout.
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
  protected readonly menuItems: Signal<MenuItem[]> = computed<MenuItem[]>((): MenuItem[] => [
    {
      label: 'Settings',
      icon: 'pi pi-cog',
      routerLink: '/account',
      data: { testid: 'header-user-menu-settings' },
    },
    { separator: true },
    {
      label: this.authLogoutPort.isLoggingOut() ? 'Logging out...' : 'Logout',
      icon: 'pi pi-sign-out',
      disabled: this.authLogoutPort.isLoggingOut(),
      command: (): void => this.onLogout(),
      data: { testid: 'header-user-menu-logout' },
    },
  ]);
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
