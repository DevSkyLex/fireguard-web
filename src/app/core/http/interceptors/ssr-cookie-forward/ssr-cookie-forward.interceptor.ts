import { isPlatformServer } from '@angular/common';
import {
  type HttpEvent,
  type HttpHandlerFn,
  type HttpInterceptorFn,
  type HttpRequest,
} from '@angular/common/http';
import { inject, PLATFORM_ID, REQUEST } from '@angular/core';
import { Observable } from 'rxjs';

const FORWARDED_COOKIE_NAME_PATTERN: RegExp =
  /^(?:__Host-|__Secure-)?(?:refresh_token|trusted_device(?:_token)?|device_trust_token)$/i;

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
 * SSR Cookie Forward Interceptor
 *
 * @description
 * Forwards incoming request cookies to server-side API calls during SSR.
 * This allows session-based endpoints (e.g. refresh) to resolve auth state
 * while rendering on the server.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @returns {Observable<HttpEvent<unknown>>} An observable of the HTTP event stream.
 */
export const ssrCookieForwardInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  /**
   * Constant platformId
   * @const platformId
   *
   * @description
   * Angular platform ID for determining if code
   * is running on server or browser. Used to conditionally
   * forward cookies only during SSR.
   *
   * @var {object}
   */
  const platformId: object = inject<object>(PLATFORM_ID);

  /**
   * Constant incomingRequest
   * @const incomingRequest
   *
   * @description
   * The incoming HTTP request during SSR, injected
   * from the REQUEST token.
   *
   * @var {Request | null}
   */
  const incomingRequest: Request | null = inject<Request>(REQUEST, { optional: true });

  // Browser runtime or missing SSR request context.
  if (!isPlatformServer(platformId) || !incomingRequest) {
    return next(req);
  }

  // Keep explicit cookie header already set by caller.
  if (req.headers.has('Cookie')) return next(req);

  // Forward cookies from incoming SSR request to outgoing API call.
  const cookieHeader: string | null = incomingRequest.headers.get('cookie');
  if (!cookieHeader) return next(req);
  const forwardedCookieHeader: string | null = filterForwardedCookies(cookieHeader);
  if (!forwardedCookieHeader) return next(req);

  // Clone the request and set the Cookie header for SSR.
  const ssrReq: HttpRequest<unknown> = req.clone({
    setHeaders: {
      Cookie: forwardedCookieHeader,
    },
  });

  return next(ssrReq);
};
