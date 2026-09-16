import type { Data } from '@angular/router';
import { DASHBOARD_MOBILE_NAVIGATION_ROOT_DATA_KEY } from '../constants/dashboard-route-data.constants';

/**
 * Interface DashboardRouteData
 * @interface DashboardRouteData
 * @description Typed route metadata consumed by the app-wide dashboard shell.
 * @since 1.0.0
 */
export interface DashboardRouteData extends Data {
  /** Suppresses contextual back navigation on a primary mobile destination. */
  readonly [DASHBOARD_MOBILE_NAVIGATION_ROOT_DATA_KEY]?: true;
}
