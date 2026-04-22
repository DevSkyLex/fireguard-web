import { InjectionToken } from '@angular/core';
import type { DashboardSecondarySidebarContribution } from './dashboard-secondary-sidebar-contribution.interface';

/**
 * Constant DASHBOARD_SECONDARY_SIDEBAR_CONTRIBUTION
 * @const DASHBOARD_SECONDARY_SIDEBAR_CONTRIBUTION
 *
 * @description
 * Multi-provider injection token for dashboard secondary sidebar contributions.
 *
 * Features register by declaring a `{ provide: DASHBOARD_SECONDARY_SIDEBAR_CONTRIBUTION, useFactory: ..., multi: true }`
 * provider in their own `provideXxx()` function. The layout resolves the full
 * array and renders the highest-priority active contribution.
 *
 * @type {InjectionToken<DashboardSecondarySidebarContribution>}
 */
export const DASHBOARD_SECONDARY_SIDEBAR_CONTRIBUTION: InjectionToken<DashboardSecondarySidebarContribution> =
  new InjectionToken<DashboardSecondarySidebarContribution>(
    'DASHBOARD_SECONDARY_SIDEBAR_CONTRIBUTION',
  );
