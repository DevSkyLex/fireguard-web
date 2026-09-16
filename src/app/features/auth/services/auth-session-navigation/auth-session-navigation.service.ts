import { isPlatformBrowser } from '@angular/common';
import { DestroyRef, inject, PLATFORM_ID, Service } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Events } from '@ngrx/signals/events';
import { merge } from 'rxjs';
import { authStoreEvents } from '@features/auth/state';

/**
 * Service AuthSessionNavigationService
 * @class AuthSessionNavigationService
 * @description Owns browser navigation after an explicit logout or an invalid session response.
 * @version 1.0.0
 */
@Service()
export class AuthSessionNavigationService {
  /**
   * Property isBrowser
   * @readonly
   * @description Whether router navigation is available in this runtime.
   * @access private
   * @since 1.0.0
   * @type {boolean}
   */
  private readonly isBrowser: boolean = isPlatformBrowser(inject(PLATFORM_ID));

  /**
   * Property events
   * @readonly
   * @description Authentication outcome stream.
   * @access private
   * @since 1.0.0
   * @type {Events}
   */
  private readonly events: Events = inject(Events);

  /**
   * Property router
   * @readonly
   * @description Router used to leave authenticated history behind.
   * @access private
   * @since 1.0.0
   * @type {Router}
   */
  private readonly router: Router = inject(Router);

  /**
   * Property destroyRef
   * @readonly
   * @description Service lifetime used to release the event subscription.
   * @access private
   * @since 1.0.0
   * @type {DestroyRef}
   */
  private readonly destroyRef: DestroyRef = inject(DestroyRef);

  /**
   * Property started
   * @description Prevents duplicate subscriptions when providers initialize more than once.
   * @access private
   * @since 1.0.0
   * @type {boolean}
   */
  private started: boolean = false;

  /**
   * Method start
   * @method start
   * @description Subscribes once to both remote logout outcomes in browser runtimes.
   * @access public
   * @since 1.0.0
   * @returns {void}
   */
  public start(): void {
    if (!this.isBrowser || this.started) return;

    this.started = true;
    merge(
      this.events.on(authStoreEvents.logoutSucceeded),
      this.events.on(authStoreEvents.logoutFailed),
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((): void => this.navigateToLogin());
  }

  /**
   * Method navigateToLogin
   * @method navigateToLogin
   * @description Replaces authenticated history with the login destination when a session is lost.
   * @access public
   * @since 1.0.0
   * @returns {void}
   */
  public navigateToLogin(): void {
    if (!this.isBrowser || this.router.url.split(/[?#]/u)[0] === '/auth/login') return;

    void this.router.navigate(['/auth/login'], { replaceUrl: true });
  }
}
