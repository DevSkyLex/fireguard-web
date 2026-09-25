import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  afterNextRender,
  computed,
  DestroyRef,
  effect,
  inject,
  Injector,
  Service,
  PLATFORM_ID,
  signal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { mediaQuery } from '@signality/core';
import { CookieService } from '@core/cookie';
import type { ThemeMode } from '../../models/theme-mode.type';
import { isThemeMode } from '../../utils';

/**
 * Service ThemeService
 * @class ThemeService
 *
 * @description
 * SSR-compatible service for managing theme preferences.
 * Uses signals with effect() for reactive cookie synchronization.
 * Explicit appearance changes use a circle-blur view transition when supported.
 *
 * @version 1.4.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Service()
export class ThemeService {
  //#region Properties
  /**
   * Property cookieService
   * @readonly
   *
   * @description
   * Cookie service for persistence.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {CookieService}
   */
  private readonly cookieService: CookieService = inject<CookieService>(CookieService);

  /**
   * Property document
   * @readonly
   *
   * @description
   * Document instance for DOM manipulation.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Document}
   */
  private readonly document: Document = inject<Document>(DOCUMENT);

  /**
   * Property platformId
   * @readonly
   *
   * @description
   * Platform identifier for SSR detection.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {object}
   */
  private readonly platformId: object = inject<object>(PLATFORM_ID);

  /**
   * Property injector
   * @readonly
   * @description Injection context for waiting until theme-dependent views have rendered.
   * @access private
   * @since 1.4.0
   * @type {Injector}
   */
  private readonly injector: Injector = inject(Injector);

  /**
   * Property activeTransition
   * @description Current theme animation, replaced when a newer choice arrives.
   * @access private
   * @since 1.4.0
   * @type {ViewTransition | null}
   */
  private activeTransition: ViewTransition | null = null;

  /**
   * Property themeChangeId
   * @description Prevents a skipped transition's deferred callback from applying an old choice.
   * @access private
   * @since 1.4.0
   * @type {number}
   */
  private themeChangeId: number = 0;

  /**
   * Property THEME_COOKIE_NAME
   * @readonly
   *
   * @description
   * Cookie name for theme preference.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {string}
   */
  private static readonly THEME_COOKIE_NAME: string = 'theme-preference';

  /**
   * Property theme
   * @readonly
   *
   * @description
   * Theme mode signal. Initialized from cookie if available.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {WritableSignal<ThemeMode>}
   */
  public readonly theme: WritableSignal<ThemeMode> = signal<ThemeMode>(this.getInitialTheme());

  /**
   * Property prefersDark
   * @readonly
   *
   * @description
   * Reactive signal reflecting the OS-level `prefers-color-scheme: dark`
   * media query. Updates live when the user switches their system theme,
   * which keeps the `'system'` mode in sync without requiring a reload.
   * SSR-safe: resolves to `false` (light) on the server.
   *
   * @access private
   * @since 1.1.0
   *
   * @type {Signal<boolean>}
   */
  private readonly prefersDark: Signal<boolean> = mediaQuery('(prefers-color-scheme: dark)', {
    initialValue: false,
  });

  /**
   * Property resolvedTheme
   * @readonly
   *
   * @description
   * Reactive signal exposing the concrete applied appearance — always
   * `'light'` or `'dark'`, with `'system'` already resolved through the
   * live {@link prefersDark} media query. Mirrors the `data-theme` attribute
   * set on the document root, so consumers that cannot read CSS (e.g. canvas
   * charts) can theme themselves and react to theme switches. SSR-safe:
   * resolves to `'light'` on the server.
   *
   * @access public
   * @since 1.2.0
   *
   * @type {Signal<'light' | 'dark'>}
   */
  public readonly resolvedTheme: Signal<'light' | 'dark'> = computed<'light' | 'dark'>(() =>
    this.resolveTheme(this.theme()),
  );
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Sets up an effect to persist theme changes to cookie
   * and apply the theme to the document.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    inject(DestroyRef).onDestroy(() => this.cancelThemeTransition());

    effect(() => {
      const currentTheme: ThemeMode = this.theme();
      if (isPlatformBrowser(this.platformId)) {
        this.persistThemeToCookie(currentTheme);
      }

      this.applyThemeToDocument(currentTheme);
    });
  }
  //#endregion

  //#region Public Methods
  /**
   * Method switchTheme
   * @method switchTheme
   *
   * @description
   * Toggles between LIGHT and DARK theme through the explicit appearance transition.
   *
   * @access public
   * @since 1.0.0
   *
   * @returns {void}
   */
  public switchTheme(): void {
    const newTheme: ThemeMode = this.theme() === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
  }

  /**
   * Method setTheme
   * @method setTheme
   *
   * @description
   * Sets the preference inside a native view transition, waiting for Angular's render
   * before the new snapshot. SSR, reduced motion and unchanged appearances apply immediately.
   * Cookie persistence and automatic system-theme updates remain driven by the effect.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {ThemeMode} mode - The theme mode to set.
   *
   * @returns {void} - Nothing.
   */
  public setTheme(mode: ThemeMode): void {
    this.cancelThemeTransition();

    if (this.resolveTheme(mode) === this.resolvedTheme() || !this.canAnimateThemeChange()) {
      this.commitTheme(mode);
      return;
    }

    const changeId: number = this.themeChangeId;
    this.document.documentElement.dataset['themeTransition'] = 'circle-blur';

    try {
      const transition: ViewTransition = this.document.startViewTransition(() => {
        if (changeId !== this.themeChangeId) return;

        this.commitTheme(mode);
        return new Promise<void>((resolve) => {
          afterNextRender({ read: () => resolve() }, { injector: this.injector });
        });
      });
      this.activeTransition = transition;

      // Skipped or hidden-document transitions reject ready but still apply their update.
      void transition.ready.catch(() => undefined);
      void transition.finished.then(
        () => this.finishThemeTransition(transition),
        () => this.finishThemeTransition(transition),
      );
    } catch {
      delete this.document.documentElement.dataset['themeTransition'];
      this.commitTheme(mode);
    }
  }

  /**
   * Method canAnimateThemeChange
   * @method canAnimateThemeChange
   * @description Checks browser support, visibility and the current reduced-motion preference.
   * @access private
   * @since 1.4.0
   * @returns {boolean} Whether an explicit appearance change can animate.
   */
  private canAnimateThemeChange(): boolean {
    return (
      isPlatformBrowser(this.platformId) &&
      typeof this.document.startViewTransition === 'function' &&
      this.document.visibilityState !== 'hidden' &&
      !this.document.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
    );
  }

  /**
   * Method commitTheme
   * @method commitTheme
   * @description Applies the preference and document colors together inside the snapshot update.
   * @access private
   * @since 1.4.0
   * @param {ThemeMode} mode - Requested preference, including system mode.
   * @returns {void} Nothing.
   */
  private commitTheme(mode: ThemeMode): void {
    this.theme.set(mode);
    this.applyThemeToDocument(mode);
  }

  /**
   * Method cancelThemeTransition
   * @method cancelThemeTransition
   * @description Invalidates pending updates and releases the previous animation's CSS scope.
   * @access private
   * @since 1.4.0
   * @returns {void} Nothing.
   */
  private cancelThemeTransition(): void {
    this.themeChangeId += 1;
    this.activeTransition?.skipTransition();
    this.activeTransition = null;
    this.document.documentElement.removeAttribute('data-theme-transition');
  }

  /**
   * Method finishThemeTransition
   * @method finishThemeTransition
   * @description Clears animation styles only when the finishing transition still owns them.
   * @access private
   * @since 1.4.0
   * @param {ViewTransition} transition - Settled browser transition.
   * @returns {void} Nothing.
   */
  private finishThemeTransition(transition: ViewTransition): void {
    if (this.activeTransition !== transition) return;

    this.activeTransition = null;
    delete this.document.documentElement.dataset['themeTransition'];
  }

  /**
   * Method getTheme
   *
   * @description
   * Gets the current theme mode.
   *
   * @access public
   * @since 1.0.0
   *
   * @returns {ThemeMode} - The current theme mode.
   */
  public getTheme(): ThemeMode {
    return this.theme();
  }

  /**
   * Method getInitialTheme
   *
   * @description
   * Reads theme from cookie or returns default.
   *
   * @access private
   * @since 1.0.0
   *
   * @returns {ThemeMode} - The initial theme mode.
   */
  private getInitialTheme(): ThemeMode {
    const cookieValue: string | null = this.cookieService.getCookie(ThemeService.THEME_COOKIE_NAME);

    if (cookieValue && isThemeMode(cookieValue)) {
      return cookieValue;
    }

    return 'light';
  }

  /**
   * Method persistThemeToCookie
   *
   * @description
   * Persists theme value to cookie.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {ThemeMode} mode - The theme to persist.
   *
   * @returns {void} - Nothing.
   */
  private persistThemeToCookie(mode: ThemeMode): void {
    this.cookieService.setCookie({
      name: ThemeService.THEME_COOKIE_NAME,
      value: mode,
      maxAge: 365 * 24 * 60 * 60,
      path: '/',
      sameSite: 'Lax',
    });
  }

  /**
   * Method applyThemeToDocument
   *
   * @description
   * Applies the theme attribute to the document's html element.
   * Resolves 'system' to 'light' or 'dark' based on user preference.
   * Runs in browser and SSR to avoid light->dark flash on hydration.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {ThemeMode} mode - The theme to apply.
   *
   * @returns {void} - Nothing.
   */
  private applyThemeToDocument(mode: ThemeMode): void {
    const resolvedTheme: 'light' | 'dark' = this.resolveTheme(mode);
    this.document.documentElement.setAttribute('data-theme', resolvedTheme);
    this.applyThemeAssets();
  }

  /**
   * Method applyThemeAssets
   * @method applyThemeAssets
   *
   * @description
   * Keeps marked non-primary-surface logos and the browser favicon on the
   * transparent primary variant. Primary surfaces opt into their white mark
   * directly in their templates.
   *
   * @access private
   * @since 1.3.0
   *
   * @returns {void} - Nothing.
   */
  private applyThemeAssets(): void {
    const primarySource: string = 'fireguard-logo-primary.svg';

    for (const logo of this.document.querySelectorAll<HTMLImageElement>('[data-theme-logo]')) {
      logo.setAttribute('src', primarySource);
    }

    for (const icon of this.document.querySelectorAll<HTMLLinkElement>('[data-theme-icon]')) {
      icon.setAttribute('href', primarySource);
    }
  }

  /**
   * Method resolveTheme
   *
   * @description
   * Resolves 'system' theme to actual 'light' or 'dark' based on
   * the user's system preference, read from the reactive
   * `prefersDark` signal so live OS theme switches are reflected.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {ThemeMode} mode - The theme mode to resolve.
   *
   * @returns {'light' | 'dark'} - The resolved theme.
   */
  private resolveTheme(mode: ThemeMode): 'light' | 'dark' {
    if (mode === 'system') {
      return this.prefersDark() ? 'dark' : 'light';
    }
    return mode;
  }
  //#endregion
}
