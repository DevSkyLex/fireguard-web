import {
  type HttpInterceptorFn,
  type HttpRequest,
  type HttpHandlerFn,
  HttpEvent,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AUTH_SESSION, type AuthSessionPort } from '@features/auth/ports';

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
 */
export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  const authSession: AuthSessionPort = inject<AuthSessionPort>(AUTH_SESSION);

  if (!req.url.includes('/api/')) return next(req);
  if (req.headers.has('Authorization')) return next(req);
  if (PUBLIC_ENDPOINTS.some((pattern: RegExp) => pattern.test(req.url))) return next(req);
  if (!authSession.isAuthenticated()) return next(req);

  const token: string | null = authSession.accessToken();
  if (!token) return next(req);

  const authReq: HttpRequest<unknown> = req.clone({
    setHeaders: { Authorization: `Bearer ${token}` },
  });

  return next(authReq);
};
