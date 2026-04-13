import { inject } from '@angular/core';
import {
  type HttpInterceptorFn,
  type HttpRequest,
  type HttpHandlerFn,
  type HttpEvent,
  HttpErrorResponse,
} from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, throwError } from 'rxjs';
import { AUTH_SESSION, type AuthSessionPort } from '@core/tokens/auth-session.token';

/**
 * Endpoints excluded from 401 handling.
 * These endpoints are expected to return 401 in normal flow
 * (e.g., refresh failure, login failure).
 * @constant
 */
const EXCLUDED_ENDPOINTS: RegExp[] = [
  /\/api\/auth\/login$/,
  /\/api\/auth\/logout$/,
  /\/api\/auth\/refresh$/,
  /\/api\/auth\/register$/,
];

/**
 * Unauthorized Interceptor
 *
 * @description
 * Handles 401 Unauthorized responses from the API.
 * Clears the auth state and redirects to the login page
 * when a 401 is received on a non-excluded endpoint.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @return {Observable<HttpEvent<unknown>>} An observable of the HTTP event stream.
 */
export const unauthorizedInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  /**
   * Constant authSession
   * @const authSession
   *
   * @description
   * Auth session port for clearing the session on 401.
   *
   * @var {AuthSessionPort}
   */
  const authSession: AuthSessionPort = inject<AuthSessionPort>(AUTH_SESSION);

  /**
   * Constant router
   * @const router
   *
   * @description
   * Angular Router instance for navigating to the login page
   * after clearing auth state on 401.
   *
   * @var {Router}
   */
  const router: Router = inject<Router>(Router);

  // Proceed with the request and handle potential 401 errors.
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !EXCLUDED_ENDPOINTS.some((pattern: RegExp) => pattern.test(req.url))) {
        authSession.clearSession();
        router.navigate(['/auth/login']);
      }

      return throwError(() => error);
    }),
  );
};
