import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { Events } from '@ngrx/signals/events';
import type { MotionOptions } from '@primeuix/motion';
import { AvatarModule } from 'primeng/avatar';
import { PanelModule, PanelPassThroughOptions } from 'primeng/panel';
import { SkeletonModule } from 'primeng/skeleton';
import { USER_IDENTITY_PORT, type UserIdentityPort } from '@features/account/ports';
import { AuthStore, authStoreEvents } from '@features/auth/state';

@Component({
  selector: 'app-auth-user-profile',
  imports: [AvatarModule, SkeletonModule, RouterLink, PanelModule],
  templateUrl: './auth-user-profile.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthUserProfile {
  /**
   * Property userIdentityPort
   * @readonly
   *
   * @description
   * Port providing access to the authenticated user's identity information.
   * Bound in the auth feature providers to the AuthStore, which holds the
   * user identity data and authentication state.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {UserIdentityPort}²
   */
  protected readonly userIdentityPort: UserIdentityPort =
    inject<UserIdentityPort>(USER_IDENTITY_PORT);

  /**
   * Property authStore
   * @readonly
   *
   * @description
   * Root store of the auth feature, responsible for
   * holding the authentication state, performing login
   * and logout operations, and exposing related
   * data and methods.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {AuthStore}
   */
  protected readonly authStore: AuthStore = inject<AuthStore>(AuthStore);

  /**
   * Property router
   * @readonly
   *
   * @description
   * Angular Router instance used for
   * navigation after logout.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Router}
   */
  private readonly router: Router = inject<Router>(Router);

  private readonly events: Events = inject<Events>(Events);

  public constructor() {
    this.events
      .on(authStoreEvents.logoutSucceeded)
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        this.router.navigate(['/auth/login']).catch(() => undefined);
      });

    this.events
      .on(authStoreEvents.logoutFailed)
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        this.router.navigate(['/auth/login']).catch(() => undefined);
      });
  }

  protected readonly panelPt: PanelPassThroughOptions = {
    root: { class: 'flex flex-col-reverse' },
    header: { class: 'border-0 p-0 bg-transparent text-inherit' },
    title: { class: 'w-full' },
    headerActions: { class: 'hidden' },
    pcToggleButton: { root: { class: 'hidden' } },
    contentContainer: {
      class: 'overflow-hidden bg-surface-0 dark:bg-surface-900 p-3',
    },
    contentWrapper: { class: 'p-0' },
    content: { class: 'p-0' },
  };

  protected readonly panelMotionOptions: MotionOptions = {
    type: 'transition',
    autoHeight: true,
    duration: { enter: 220, leave: 180 },
    enterClass: {
      from: 'h-0 opacity-0 translate-y-1',
      active: 'overflow-hidden transition-[height,opacity,transform] duration-220 ease-in-out',
      to: 'h-[var(--pui-motion-height)] opacity-100 translate-y-0',
    },
    leaveClass: {
      from: 'h-[var(--pui-motion-height)] opacity-100 translate-y-0',
      active: 'overflow-hidden transition-[height,opacity,transform] duration-180 ease-in-out',
      to: 'h-0 opacity-0 translate-y-1',
    },
  };

  protected onLogout(): void {
    if (this.authStore.isLoggingOut()) return;
    this.authStore.logout();
  }
}
