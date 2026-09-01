import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideLogOut } from '@ng-icons/lucide';
import { Events } from '@ngrx/signals/events';
import { AUTH_LOGOUT_PORT, type AuthLogoutPort } from '@features/auth/ports';
import { authStoreEvents } from '@features/auth/state';
import { HlmButton } from '@shared/ui/button';

/**
 * Component LogoutControl
 * @class LogoutControl
 *
 * @description
 * A discreet sign-out affordance for shells that render no account menu — the
 * onboarding wizard's header being the canonical host. It consumes the auth
 * feature's own logout, then leaves for the sign-in screen once the session
 * has ended: it listens to `sessionEnded` rather than the logout call's
 * outcome, because a failed logout request still ends the local session.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-logout-control />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-logout-control',
  imports: [NgIcon, HlmButton],
  providers: [provideIcons({ lucideLogOut })],
  templateUrl: './logout-control.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LogoutControl {
  //#region Properties
  /**
   * Property logoutPort
   * @readonly
   *
   * @description
   * Auth-owned logout contract: what the button triggers and what names the
   * in-flight state.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {AuthLogoutPort}
   */
  protected readonly logoutPort: AuthLogoutPort = inject<AuthLogoutPort>(AUTH_LOGOUT_PORT);

  /**
   * Property router
   * @readonly
   *
   * @description
   * Used to leave for the sign-in screen once the session has ended.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Router}
   */
  private readonly router: Router = inject<Router>(Router);
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Subscribes to the auth store's `sessionEnded` event for as long as this
   * control is rendered, and navigates to the sign-in screen when it fires.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    inject<Events>(Events)
      .on(authStoreEvents.sessionEnded)
      .pipe(takeUntilDestroyed())
      .subscribe((): void => {
        void this.router.navigate(['/auth/login']);
      });
  }
  //#endregion
}
