import { isPlatformServer } from '@angular/common';
import {
  HttpErrorResponse,
  HttpResponse,
  type HttpEvent,
  type HttpHandlerFn,
  type HttpInterceptorFn,
  type HttpRequest,
} from '@angular/common/http';
import { inject, PLATFORM_ID, REQUEST, RESPONSE_INIT } from '@angular/core';
import { Observable, tap } from 'rxjs';

/**
 * Constant FORWARDED_COOKIE_NAME_PATTERN
 *
 * @description
 * Matches refresh-token and trusted-device cookie names eligible for forwarding to SSR API
 * requests.
 *
 * @access private
 * @since 0.1.0
 *
 * @type {RegExp}
 */
const FORWARDED_COOKIE_NAME_PATTERN: RegExp =
  /^(?:__Host-|__Secure-)?(?:refresh_token|trusted_device(?:_token)?|device_trust_token)$/i;

/**
 * Constant REFRESH_COOKIE_HEADER_PATTERN
 *
 * @description
 * Selects refresh-token `Set-Cookie` headers for the same-host refresh response forwarded to HTML.
 *
 * @access private
 * @since unreleased
 *
 * @type {RegExp}
 */
const REFRESH_COOKIE_HEADER_PATTERN: RegExp = /^(?:__Host-|__Secure-)?refresh_token=/i;

/**
 * Function forwardRotatedRefreshCookie
 *
 * @description
 * Carries a same-host API refresh cookie from the SSR API response to the HTML
 * response so hydration uses the token that SSR just rotated.
 *
 * @access private
 * @since 1.0.0
 *
 * @param {HttpResponse<unknown> | HttpErrorResponse} response - Refresh API response.
 * @param {ResponseInit} responseInit - Mutable SSR response options.
 *
 * @returns {void}
 *
 * @function forwardRotatedRefreshCookie
 */
function forwardRotatedRefreshCookie(
  response: HttpResponse<unknown> | HttpErrorResponse,
  responseInit: ResponseInit,
): void {
  const cookies = (response.headers.getAll('set-cookie') ?? []).filter((cookie: string) =>
    REFRESH_COOKIE_HEADER_PATTERN.test(cookie),
  );
  if (cookies.length === 0) return;

  const headers = new Headers(responseInit.headers);
  for (const cookie of cookies) {
    headers.append('Set-Cookie', cookie);
  }
  responseInit.headers = headers;
}

/**
 * Function filterForwardedCookies
 *
 * @description
 * Keeps eligible session cookies from the incoming header and returns `null` when none match.
 *
 * @access private
 * @since 0.1.0
 *
 * @param {string} cookieHeader - Cookie header from the incoming SSR request.
 *
 * @returns {string | null} Eligible cookies joined for forwarding, or `null` when none match.
 */
function filterForwardedCookies(cookieHeader: string): string | null {
  const forwardedCookies: string[] = cookieHeader
    .split(';')
    .map((cookie) => cookie.trim())
    .filter((cookie) => {
      const cookieName: string = cookie.split('=')[0] ?? '';
      return FORWARDED_COOKIE_NAME_PATTERN.test(cookieName);
    });

  if (forwardedCookies.length === 0) return null;
  return forwardedCookies.join('; ');
}

/**
 * Function ssrCookieForwardInterceptor
 *
 * @description
 * Forwards incoming request cookies to server-side API calls during SSR.
 * A same-host refresh also forwards its rotated cookie to the HTML response,
 * keeping browser hydration on the server's new session token.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @param {HttpRequest<unknown>} req - Outgoing request whose cookies must be forwarded during SSR.
 * @param {HttpHandlerFn} next - Next interceptor or HTTP backend in the request chain.
 *
 * @returns {Observable<HttpEvent<unknown>>} An observable of the HTTP event stream.
 *
 * @function ssrCookieForwardInterceptor
 */
export const ssrCookieForwardInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  /**
   * Constant platformId
   *
   * @description
   * Angular platform ID for determining if code
   * is running on server or browser. Used to conditionally
   * forward cookies only during SSR.
   *
   * @constant platformId
   *
   * @member {object}
   */
  const platformId: object = inject<object>(PLATFORM_ID);

  /**
   * Constant incomingRequest
   *
   * @description
   * The incoming HTTP request during SSR, injected
   * from the REQUEST token.
   *
   * @constant incomingRequest
   *
   * @member {Request | null}
   */
  const incomingRequest: Request | null = inject<Request>(REQUEST, { optional: true });
  const responseInit: ResponseInit | null = inject(RESPONSE_INIT, { optional: true });

  // Browser runtime or missing SSR request context.
  if (!isPlatformServer(platformId) || !incomingRequest) {
    return next(req);
  }

  const cookieHeader: string | null = incomingRequest.headers.get('cookie');
  const forwardedCookieHeader: string | null = cookieHeader
    ? filterForwardedCookies(cookieHeader)
    : null;
  const ssrReq: HttpRequest<unknown> =
    req.headers.has('Cookie') || !forwardedCookieHeader
      ? req
      : req.clone({ setHeaders: { Cookie: forwardedCookieHeader } });

  const apiUrl = new URL(req.url, incomingRequest.url);
  const pageUrl = new URL(incomingRequest.url);
  if (
    !responseInit ||
    apiUrl.hostname !== pageUrl.hostname ||
    apiUrl.pathname !== '/api/auth/refresh'
  ) {
    return next(ssrReq);
  }

  return next(ssrReq).pipe(
    tap({
      next: (event: HttpEvent<unknown>): void => {
        if (event instanceof HttpResponse) forwardRotatedRefreshCookie(event, responseInit);
      },
      error: (error: unknown): void => {
        if (error instanceof HttpErrorResponse) forwardRotatedRefreshCookie(error, responseInit);
      },
    }),
  );
};
