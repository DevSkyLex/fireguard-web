import { isPlatformBrowser } from '@angular/common';
import {
  DestroyRef,
  inject,
  Injectable,
  PLATFORM_ID,
  signal,
  computed,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  Router,
} from '@angular/router';
import { filter } from 'rxjs';
import { AUTH_SESSION_PORT, type AuthSessionPort } from '@features/auth/ports';

/**
 * Service SplashScreenService
 * @class SplashScreenService
 *
 * @description
 * Manages the global splash screen visibility for two scenarios:
 * - **Boot**: visible while the auth session has not yet initialized.
 * - **Navigation**: visible during lazy-loaded route transitions
 *   that exceed the anti-flicker threshold.
 *
 * The service exposes a single `visible` signal consumed by the
 * `SplashScreen` component at the root level through the
 * `SPLASH_SCREEN_PORT` neutral contract.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Injectable({ providedIn: 'root' })
export class SplashScreenService {
  //#region Constants
  /**
   * Anti-flicker delay in milliseconds.
   * Navigation splash only appears if the transition takes longer.
   */
  private static readonly NAV_DELAY_MS: number = 150;

  //#endregion

  //#region Dependencies
  /**
   * Property router
   * @readonly
   *
   * @description
   * Angular router used to listen for navigation lifecycle events
   * and drive the navigation splash visibility.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Router}
   */
  private readonly router: Router = inject<Router>(Router);

  /**
   * Property authSession
   * @readonly
   *
   * @description
   * Auth session port consumed to derive the boot state from
   * the auth initialization signal.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {AuthSessionPort}
   */
  private readonly authSession: AuthSessionPort = inject<AuthSessionPort>(AUTH_SESSION_PORT);

  /**
   * Property platformId
   * @readonly
   *
   * @description
   * Platform identifier used to guard browser-only logic such as
   * router event subscriptions.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {object}
   */
  private readonly platformId: object = inject<object>(PLATFORM_ID);

  /**
   * Property destroyRef
   * @readonly
   *
   * @description
   * Destroy reference passed to `takeUntilDestroyed` to clean up
   * the router event subscription when the service is destroyed.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {DestroyRef}
   */
  private readonly destroyRef: DestroyRef = inject<DestroyRef>(DestroyRef);
  //#endregion

  //#region State
  /**
   * Property booting
   * @readonly
   *
   * @description
   * True while the auth session has not yet completed its
   * initialization on first load.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  private readonly booting: Signal<boolean> = computed<boolean>(
    () => !this.authSession.initialized(),
  );

  /**
   * Property initialNavigationPending
   *
   * @description
   * Keeps the splash visible until the first navigation lifecycle settles.
   * This avoids exposing a white frame between app bootstrap and route render.
   */
  private readonly initialNavigationPending: WritableSignal<boolean> = signal<boolean>(
    !this.router.navigated,
  );

  /**
   * Property navigating
   * @readonly
   *
   * @description
   * True during a navigation transition that exceeded the
   * anti-flicker delay threshold.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  private readonly navigating: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property visible
   * @readonly
   *
   * @description
   * Combined visibility signal: the splash is shown when the app
   * is booting OR during a navigation transition.
   * Consumed by `SplashScreen` through the `SPLASH_SCREEN_PORT`.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  public readonly visible: Signal<boolean> = computed<boolean>(
    () => this.booting() || this.initialNavigationPending() || this.navigating(),
  );
  //#endregion

  //#region Internal
  /**
   * Property navTimer
   *
   * @description
   * Handle for the anti-flicker timer. Non-null while a navigation
   * start has been detected but the delay threshold has not elapsed.
   * Cleared on navigation end or when a new navigation pre-empts it.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {ReturnType<typeof setTimeout> | null}
   */
  private navTimer: ReturnType<typeof setTimeout> | null = null;
  //#endregion

  //#region Constructor
  public constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.listenToRouter();
    }
  }
  //#endregion

  //#region Private Methods
  /**
   * Method listenToRouter
   *
   * @description
   * Subscribes to router lifecycle events and manages the `navigating`
   * signal with an anti-flicker delay. Only `NavigationStart` triggers
   * the timer; `NavigationEnd`, `NavigationCancel`, and `NavigationError`
   * all resolve it.
   *
   * @access private
   * @since 1.0.0
   *
   * @returns {void}
   */
  private listenToRouter(): void {
    this.router.events
      .pipe(
        filter(
          (e) =>
            e instanceof NavigationStart ||
            e instanceof NavigationEnd ||
            e instanceof NavigationCancel ||
            e instanceof NavigationError,
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event) => {
        if (event instanceof NavigationStart) {
          this.onNavigationStart();
        } else {
          this.onNavigationEnd();
        }
      });
  }

  /**
   * Method onNavigationStart
   *
   * @description
   * Schedules the navigation splash appearance after the anti-flicker
   * delay. Has no effect when a timer is already running, preventing
   * re-entrant navigations from resetting the countdown.
   *
   * @access private
   * @since 1.0.0
   *
   * @returns {void}
   */
  private onNavigationStart(): void {
    if (this.navTimer !== null) return;

    this.navTimer = setTimeout(() => {
      this.navigating.set(true);
    }, SplashScreenService.NAV_DELAY_MS);
  }

  /**
   * Method onNavigationEnd
   *
   * @description
   * Clears any pending anti-flicker timer and hides the navigation
   * splash. Called on `NavigationEnd`, `NavigationCancel`, and
   * `NavigationError`.
   *
   * @access private
   * @since 1.0.0
   *
   * @returns {void}
   */
  private onNavigationEnd(): void {
    if (this.navTimer !== null) {
      clearTimeout(this.navTimer);
      this.navTimer = null;
    }
    this.navigating.set(false);

    if (this.initialNavigationPending()) {
      this.initialNavigationPending.set(false);
    }
  }

  //#endregion
}
