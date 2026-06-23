import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { inject, Injectable, LOCALE_ID, PLATFORM_ID } from '@angular/core';
import { CookieService } from '@core/cookie';
import {
  DEFAULT_LOCALE_SUBPATH,
  LANG_COOKIE_NAME,
  SUPPORTED_LOCALES,
} from '../../constants/app-locale.constants';
import type { AppLocaleOption, AppLocaleSubPath } from '../../models/app-locale.type';
import { isSupportedLocale, stripLocaleFromPathname } from '../../utils/locale-resolution.utils';

/**
 * Service LocalePreferenceService
 * @class LocalePreferenceService
 *
 * @description
 * App-wide infrastructure service that owns the user's display-language
 * preference. Because localization is build-time (`@angular/localize` serves one
 * compiled bundle per locale under `/en`, `/fr`, `/es`), switching language is a
 * hard navigation to the target locale sub-path, not a runtime string swap.
 *
 * The explicit choice is persisted in the {@link LANG_COOKIE_NAME} cookie so the
 * SSR server serves the right bundle on the next request; clearing it falls back
 * to the browser `Accept-Language` header.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Injectable({ providedIn: 'root' })
export class LocalePreferenceService {
  //#region Properties
  /**
   * Property document
   * @readonly
   *
   * @description
   * Document handle used to read the current location and trigger the
   * locale-switching navigation.
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
   * Platform identifier used to keep navigation and cookie writes browser-only.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {object}
   */
  private readonly platformId: object = inject<object>(PLATFORM_ID);

  /**
   * Property localeId
   * @readonly
   *
   * @description
   * Framework locale identifier of the active bundle (`en-US`, `fr`, `es`), used
   * to resolve the current locale during SSR when no URL is available.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {string}
   */
  private readonly localeId: string = inject<string>(LOCALE_ID);

  /**
   * Property cookieService
   * @readonly
   *
   * @description
   * SSR-compatible cookie accessor used to persist and clear the explicit
   * language choice.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {CookieService}
   */
  private readonly cookieService: CookieService = inject<CookieService>(CookieService);

  /**
   * Property options
   * @readonly
   *
   * @description
   * Display languages offered to the user, in picker order.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {ReadonlyArray<AppLocaleOption>}
   */
  public readonly options: ReadonlyArray<AppLocaleOption> = SUPPORTED_LOCALES;
  //#endregion

  //#region Methods
  /**
   * Method current
   * @method current
   *
   * @description
   * Resolves the currently active display language. In the browser it derives
   * from the URL locale sub-path; on the server it derives from the active
   * bundle `LOCALE_ID`.
   *
   * @access public
   * @since 1.0.0
   *
   * @returns {AppLocaleSubPath} The active locale sub-path.
   */
  public current(): AppLocaleSubPath {
    if (isPlatformBrowser(this.platformId)) {
      const segment = this.document.location.pathname.split('/')[1];
      if (isSupportedLocale(segment)) return segment;
    }

    return this.fromLocaleId(this.localeId);
  }

  /**
   * Method setLocale
   * @method setLocale
   *
   * @description
   * Persists an explicit language choice and navigates to the same route under
   * the selected locale sub-path. No-op on the server or when the locale is
   * already active.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {AppLocaleSubPath} subPath - Locale sub-path to switch to.
   * @returns {void}
   */
  public setLocale(subPath: AppLocaleSubPath): void {
    if (!isPlatformBrowser(this.platformId) || subPath === this.current()) return;

    this.cookieService.setCookie({
      name: LANG_COOKIE_NAME,
      value: subPath,
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'Lax',
    });

    const location = this.document.location;
    this.document.location.assign(
      `/${subPath}${stripLocaleFromPathname(location.pathname)}${location.search}${location.hash}`,
    );
  }

  /**
   * Method useBrowserDefault
   * @method useBrowserDefault
   *
   * @description
   * Clears the explicit language choice and navigates to the current route
   * without a locale prefix so the SSR server re-resolves the locale from the
   * browser `Accept-Language` header. No-op on the server.
   *
   * @access public
   * @since 1.0.0
   *
   * @returns {void}
   */
  public useBrowserDefault(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.cookieService.deleteCookie(LANG_COOKIE_NAME);

    const location = this.document.location;
    this.document.location.assign(
      `${stripLocaleFromPathname(location.pathname)}${location.search}${location.hash}`,
    );
  }

  /**
   * Method fromLocaleId
   * @method fromLocaleId
   *
   * @description
   * Maps a framework `LOCALE_ID` (e.g. `en-US`) to its supported sub-path,
   * falling back to the default source locale.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {string} localeId - Framework locale identifier.
   * @returns {AppLocaleSubPath} The matching locale sub-path.
   */
  private fromLocaleId(localeId: string): AppLocaleSubPath {
    const base = localeId.toLowerCase().split('-')[0];
    return isSupportedLocale(base) ? base : DEFAULT_LOCALE_SUBPATH;
  }
  //#endregion
}
