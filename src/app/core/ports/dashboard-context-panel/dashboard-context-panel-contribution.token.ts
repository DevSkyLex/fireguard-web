import { InjectionToken } from '@angular/core';
import type { DashboardContextPanelContribution } from './dashboard-context-panel-contribution.interface';

/**
 * Constant DASHBOARD_CONTEXT_PANEL_CONTRIBUTION
 * @const DASHBOARD_CONTEXT_PANEL_CONTRIBUTION
 *
 * @description
 * Multi-provider injection token for dashboard secondary sidebar contributions.
 *
 * Features register by declaring a `{ provide: DASHBOARD_CONTEXT_PANEL_CONTRIBUTION, useFactory: ..., multi: true }`
 * provider in their own `provideXxx()` function. The layout resolves the full
 * array and renders the highest-priority active contribution.
 *
 * @type {InjectionToken<DashboardContextPanelContribution>}
 */
export const DASHBOARD_CONTEXT_PANEL_CONTRIBUTION: InjectionToken<DashboardContextPanelContribution> =
  new InjectionToken<DashboardContextPanelContribution>(
    'DASHBOARD_CONTEXT_PANEL_CONTRIBUTION',
  );
