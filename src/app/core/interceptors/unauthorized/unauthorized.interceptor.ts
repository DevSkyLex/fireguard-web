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
import { OrganizationStore } from '@core/stores/organization';
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
 * @return {Observable<HttpEvent<unknown>>} An observable of the HTTP event stream.
 */
export const unauthorizedInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  /**
   * Constant authStore
   * @const authStore
   *
   * @description
   * AuthStore instance for managing authentication
   * state. Used to clear the auth token on 401.
   *
   * @var {AuthStore}
   */
  const authStore: AuthStore = inject<AuthStore>(AuthStore);

  /**
   * Constant userStore
   * @const userStore
   *
   * @description
   * UserStore instance for managing user state. Used to clear
   * user information on 401.
   *
   * @var {UserStore}
   */
  const userStore: UserStore = inject<UserStore>(UserStore);

  /**
   * Constant organizationStore
   * @const organizationStore
   *
   * @description
   * OrganizationStore instance for managing organization state. Used to reset
   * organization information on 401.
   *
   * @var {OrganizationStore}
   */
  const organizationStore: OrganizationStore =
    inject<OrganizationStore>(OrganizationStore);

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
        authStore.clearToken();
        userStore.clear();
        organizationStore.resetStore();
        router.navigate(['/auth/login']);
      }

      return throwError(() => error);
    }),
  );
};
