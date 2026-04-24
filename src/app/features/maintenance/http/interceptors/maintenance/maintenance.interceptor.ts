import {
  type HttpEvent,
  type HttpHandlerFn,
  HttpErrorResponse,
  type HttpInterceptorFn,
  type HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, throwError } from 'rxjs';
import { MaintenanceStore } from '@features/maintenance/state';

/**
 * Interceptor maintenanceInterceptor
 *
 * @description
 * Intercepts 503 Service Unavailable responses from the API.
 * Activates the maintenance mode store and navigates the user
 * to the maintenance page.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const maintenanceInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  /**
   * Constant store
   * @const store
   *
   * @description
   * Injects the MaintenanceStore to activate maintenance mode
   * when a 503 response is intercepted.
   *
   * @type {MaintenanceStore}
   */
  const store: MaintenanceStore =
    inject<MaintenanceStore>(MaintenanceStore);

  /**
   * Constant router
   * @const router
   *
   * @description
   * Injects the Router to navigate to the maintenance
   * page when a 503 response is intercepted.
   *
   * @type {Router}
   */
  const router: Router =
    inject<Router>(Router);

  // Pass through the request and catch errors
  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 503) {
        store.activate();
        router.navigate(['/maintenance']);
      }

      return throwError(() => error);
    }),
  );
};
