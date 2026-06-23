import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID, REQUEST } from '@angular/core';
import type { CookieOptions } from '../../models';

/**
 * Service CookieService
 * @class CookieService
 *
 * @description
 * SSR-compatible service for managing cookies.
 * Reads from document in browser, from request headers in SSR.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Injectable({ providedIn: 'root' })
export class CookieService {
  //#region Properties
  /**
   * Property platformId
   * @readonly
   *
   * @description
   * Platform identifier for SSR detection.
   *
   * @access private
   * @memberof CookieService
   * @since 1.0.0
   *
   * @type {Object}
   */
  private readonly platformId: object = inject<object>(PLATFORM_ID);

  /**
   * Property request
   * @readonly
   *
   * @description
   * Request object from the server (SSR context).
   *
   * @access private
   * @memberof CookieService
   * @since 1.0.0
   *
   * @type {Request | null}
   */
  private readonly request: Request | null = inject<Request>(REQUEST, { optional: true });
  //#endregion

  //#region Methods
  /**
   * Method getCookie
   * @method getCookie
   *
   * @description
   * Retrieves a cookie value by name.
   * Uses document in browser, request headers in SSR.
   *
   * @access public
   * @memberof CookieService
   * @since 1.0.0
   *
   * @param {string} name - The cookie name.
   *
   * @returns {T | null} - The cookie value or null.
   */
  public getCookie<T>(name: string): T | null {
    if (!isPlatformBrowser(this.platformId)) return this.getCookieFromRequest<T>(name);
    return this.getCookieFromDocument<T>(name);
  }

  /**
   * Method getCookieFromDocument
   * @method getCookieFromDocument
   *
   * @description
   * Retrieves a cookie value from the document.
   *
   * @access private
   * @memberof CookieService
   * @since 1.0.0
   *
   * @param {string} name - The cookie name.
   *
   * @returns {T | null} - The cookie value or null.
   */
  private getCookieFromDocument<T>(name: string): T | null {
    const matchingCookie: string | undefined = document.cookie
      .split(';')
      .find((cookieEntry: string) => cookieEntry.trim().startsWith(`${name}=`));

    return matchingCookie ? (matchingCookie.split('=')[1] as T) : null;
  }

  /**
   * Method getCookieFromRequest
   * @method getCookieFromRequest
   *
   * @description
   * Retrieves a cookie value from the request headers (SSR).
   *
   * @access private
   * @memberof CookieService
   * @since 1.0.0
   *
   * @param {string} name - The cookie name.
   *
   * @returns {T | null} - The cookie value or null.
   */
  private getCookieFromRequest<T>(name: string): T | null {
    if (!this.request) return null;

    const cookieHeader = this.request.headers.get('cookie');
    if (!cookieHeader) return null;

    const cookies = cookieHeader.split(';');
    const cookie = cookies.find((c) => c.trim().startsWith(`${name}=`));

    return cookie ? ((cookie.split('=')[1]?.trim() as T) ?? null) : null;
  }

  /**
   * Method setCookie
   * @method setCookie
   *
   * @description
   * Sets a cookie in the document.
   * Only works in browser context.
   *
   * @access public
   * @memberof CookieService
   * @since 1.0.0
   *
   * @param {CookieOptions<T>} options - The cookie options.
   *
   * @returns {void}
   */
  public setCookie<T>(options: CookieOptions<T>): void {
    if (!isPlatformBrowser(this.platformId)) return;

    let cookieString: string = `${options.name}=${String(options.value)};`;

    if (options.maxAge !== undefined) cookieString += ` max-age=${options.maxAge};`;
    if (options.expires) cookieString += ` expires=${options.expires.toUTCString()};`;
    if (options.path) cookieString += ` path=${options.path};`;
    if (options.domain) cookieString += ` domain=${options.domain};`;
    if (options.secure) cookieString += ` secure;`;
    if (options.sameSite) cookieString += ` samesite=${options.sameSite};`;

    document.cookie = cookieString;
  }

  /**
   * Method deleteCookie
   * @method deleteCookie
   *
   * @description
   * Deletes a cookie by name.
   * Only works in browser context.
   *
   * @access public
   * @memberof CookieService
   * @since 1.0.0
   *
   * @param {string} name - The cookie name.
   *
   * @returns {void}
   */
  public deleteCookie(name: string): void {
    if (!isPlatformBrowser(this.platformId)) return;
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
  }

  /**
   * Method clearCookies
   *
   * @description
   * Deletes all cookies from the document.
   * Only works in browser context.
   *
   * @access public
   * @memberof CookieService
   * @since 1.0.0
   *
   * @returns {void}
   */
  public clearCookies(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const cookies: string[] = document.cookie.split(';');
    for (const cookie of cookies) {
      const cookieName: string = cookie.split('=')[0]?.trim() ?? '';
      if (!cookieName) continue;
      this.deleteCookie(cookieName);
    }
  }
  //#endregion
}
