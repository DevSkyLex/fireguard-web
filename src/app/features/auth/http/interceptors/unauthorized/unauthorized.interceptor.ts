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
import { AUTH_SESSION, type AuthSessionPort } from '@features/auth/ports';

/**
 * Endpoints excluded from 401 handling.
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
 */
export const unauthorizedInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  const authSession: AuthSessionPort = inject<AuthSessionPort>(AUTH_SESSION);
  const router: Router = inject<Router>(Router);

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
