import { DestroyRef, inject, Injectable, PLATFORM_ID, signal, computed, type Signal, type WritableSignal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  Router,
} from '@angular/router';
import { filter } from 'rxjs';
import { AUTH_SESSION, type AuthSessionPort } from '@features/auth/ports';

/**
 * Service SplashScreenService
 * @class SplashScreenService
 *
 * @description
 * Manages the global splash screen visibility for two scenarios:
 * - **Boot**: visible while the auth state is being initialized.
 * - **Navigation**: visible during lazy-loaded route transitions
 *   that exceed the anti-flicker threshold.
 *
 * The service exposes a single `visible` signal consumed by the
 * SplashScreenComponent at the root level. On first boot, the
 * static HTML fallback in index.html is also removed.
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
  private readonly router: Router = inject<Router>(Router);
  private readonly authSession: AuthSessionPort = inject<AuthSessionPort>(AUTH_SESSION);
  private readonly platformId: object = inject<object>(PLATFORM_ID);
  private readonly destroyRef: DestroyRef = inject<DestroyRef>(DestroyRef);
  //#endregion

  //#region State
  /**
   * True while auth has not yet initialized (first load).
   */
  private readonly booting: Signal<boolean> = computed<boolean>(
    () => !this.authSession.initialized(),
  );

  /**
   * True during a navigation transition that exceeded the delay threshold.
   */
  private readonly navigating: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Combined visibility: splash is shown when booting OR navigating.
   */
  public readonly visible: Signal<boolean> = computed<boolean>(
    () => this.booting() || this.navigating(),
  );
  //#endregion

  //#region Internal
  private navTimer: ReturnType<typeof setTimeout> | null = null;
  private staticFallbackRemoved: boolean = false;
  //#endregion

  //#region Constructor
  public constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.listenToRouter();
      this.scheduleStaticFallbackRemoval();
    }
  }
  //#endregion

  //#region Private Methods
  /**
   * Subscribes to router events and manages the navigating signal
   * with an anti-flicker delay.
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

  private onNavigationStart(): void {
    if (this.navTimer !== null) return;

    this.navTimer = setTimeout(() => {
      this.navigating.set(true);
    }, SplashScreenService.NAV_DELAY_MS);
  }

  private onNavigationEnd(): void {
    if (this.navTimer !== null) {
      clearTimeout(this.navTimer);
      this.navTimer = null;
    }
    this.navigating.set(false);
  }

  /**
   * Removes the static HTML splash fallback from index.html
   * once Angular has bootstrapped.
   */
  private scheduleStaticFallbackRemoval(): void {
    if (this.staticFallbackRemoved) return;
    this.staticFallbackRemoved = true;

    requestAnimationFrame(() => {
      const el: HTMLElement | null =
        document.getElementById('static-splash');
      el?.remove();
    });
  }
  //#endregion
}
