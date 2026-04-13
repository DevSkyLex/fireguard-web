import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { effect, inject, Injectable, PLATFORM_ID, signal, type WritableSignal } from '@angular/core';
import { CookieService } from '@core/services/cookie';
import { isThemeMode, type ThemeMode } from '@core/ports/theme';

/**
 * Service ThemeService
 * @class ThemeService
 *
 * @description
 * SSR-compatible service for managing theme preferences.
 * Uses signals with effect() for reactive cookie synchronization.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Injectable({ providedIn: 'root' })
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
  private readonly cookieService: CookieService =
    inject<CookieService>(CookieService);

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
  private readonly document: Document =
    inject<Document>(DOCUMENT);

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
  private readonly platformId: object =
    inject<object>(PLATFORM_ID);

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
  public readonly theme: WritableSignal<ThemeMode> =
    signal<ThemeMode>(this.getInitialTheme());
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
   *
   * @description
   * Toggles between LIGHT and DARK theme.
   *
   * @access public
   * @since 1.0.0
   *
   * @returns {void}
   */
  public switchTheme(): void {
    const newTheme: ThemeMode =
      this.theme() === 'light' ? 'dark' : 'light';
    this.theme.set(newTheme);
  }

  /**
   * Method setTheme
   *
   * @description
   * Sets the theme mode. Cookie is automatically
   * persisted via effect().
   *
   * @access public
   * @since 1.0.0
   *
   * @param {ThemeMode} mode - The theme mode to set.
   *
   * @returns {void} - Nothing.
   */
  public setTheme(mode: ThemeMode): void {
    this.theme.set(mode);
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
    const cookieValue: string | null =
      this.cookieService.getCookie(ThemeService.THEME_COOKIE_NAME);

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
      expires: 365 * 24 * 60 * 60,
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
  }

  /**
   * Method resolveTheme
   *
   * @description
   * Resolves 'system' theme to actual 'light' or 'dark' based on
   * the user's system preference (prefers-color-scheme).
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
      if (!isPlatformBrowser(this.platformId)) {
        return 'light';
      }

      const mediaQuery: MediaQueryList | undefined =
        this.document.defaultView?.matchMedia('(prefers-color-scheme: dark)');

      const prefersDark: boolean = mediaQuery?.matches ?? false;

      return prefersDark ? 'dark' : 'light';
    }
    return mode;
  }
  //#endregion
}
