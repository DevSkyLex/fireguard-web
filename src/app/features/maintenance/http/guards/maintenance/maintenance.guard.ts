import { inject } from '@angular/core';
import { type CanActivateFn, Router, type UrlTree } from '@angular/router';
import { MaintenanceStore } from '@features/maintenance/state';

/**
 * Guard maintenanceGuard
 *
 * @description
 * Prevents navigation to protected routes when the application
 * is in maintenance mode. Redirects to `/maintenance`.
 *
 * Apply this guard to any route that should be blocked during
 * maintenance windows (typically all authenticated routes).
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const maintenanceGuard: CanActivateFn = (): true | UrlTree => {
  /**
   * Property store
   * @const store
   *
   * @description
   * Injects the MaintenanceStore to check the current
   * maintenance mode status.
   *
   * @type {MaintenanceStore}
   */
  const store: MaintenanceStore = inject<MaintenanceStore>(MaintenanceStore);

  /**
   * Property router
   * @const router
   *
   * @description
   * Injects the Router to perform a redirection to the maintenance page
   * when the application is in maintenance mode.
   *
   * @type {Router}
   */
  const router: Router = inject<Router>(Router);

  // If maintenance mode is active, redirect to the maintenance page
  if (store.isActive()) {
    return router.createUrlTree(['/maintenance']);
  }

  return true;
};
