import { inject } from '@angular/core';
import { type HttpInterceptorFn, type HttpRequest, type HttpHandlerFn, HttpEvent } from '@angular/common/http';
import { AUTH_SESSION, type AuthSessionPort } from '@core/tokens/auth-session.token';
import { Observable } from 'rxjs';

/**
 * Public endpoints that don't require authentication
 * @constant
 */
const PUBLIC_ENDPOINTS: RegExp[] = [
  /\/api\/auth\/login$/,
  /\/api\/auth\/logout$/,
  /\/api\/auth\/refresh$/,
  /\/api\/auth\/register$/,
  /\/api\/oauth2\/token$/,
];

/**
 * Auth Interceptor
 *
 * @description
 * Adds Bearer token to outgoing API requests.
 * Skips requests that don't require authentication.
 *
 * @version 2.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @example
 * ```typescript
 * // In app.config.ts
 * provideHttpClient(
 *   withInterceptors([authInterceptor])
 * )
 * ```
 */
export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  /**
   * Constant authSession
   * @const authSession
   *
   * @description
   * Auth session port for accessing the current token.
   *
   * @var {AuthSessionPort}
   */
  const authSession: AuthSessionPort = inject<AuthSessionPort>(AUTH_SESSION);

  /**
   * Constant token
   * @const token
   *
   * @description
   * Access token from auth session. Used for
   * adding Authorization header.
   *
   * @var {string | null}
   */
  const token: string | null = authSession.accessToken();

  // Skip if no token
  if (!token) return next(req);

  // Skip if request is not to our API
  if (!req.url.includes('/api/')) return next(req);

  // Skip if request already has Authorization header
  if (req.headers.has('Authorization')) return next(req);

  // Skip public endpoints
  if (PUBLIC_ENDPOINTS.some((pattern: RegExp) => pattern.test(req.url))) return next(req);

  // Clone request and add Authorization header
  const authReq: HttpRequest<unknown> = req.clone({
    setHeaders: { Authorization: `Bearer ${token}` },
  });

  return next(authReq);
};
