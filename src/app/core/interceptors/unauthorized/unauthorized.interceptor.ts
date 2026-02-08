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
import { AuthStore } from '@core/stores/auth';
import { UserStore } from '@core/stores/user';

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
 * @example
 * ```typescript
 * // In app.config.ts
 * provideHttpClient(
 *   withInterceptors([authInterceptor, unauthorizedInterceptor])
 * )
 * ```
 */
export const unauthorizedInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  const authStore: AuthStore = inject<AuthStore>(AuthStore);
  const userStore: UserStore = inject<UserStore>(UserStore);
  const router: Router = inject<Router>(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (
        error.status === 401 &&
        !EXCLUDED_ENDPOINTS.some((pattern: RegExp) => pattern.test(req.url))
      ) {
        authStore.clearToken();
        userStore.clear();
        router.navigate(['/auth/login']);
      }

      return throwError(() => error);
    }),
  );
};
