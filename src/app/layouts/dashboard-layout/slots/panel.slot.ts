import { InjectionToken } from '@angular/core';
import type { DashboardPanelContribution } from '../models';

/**
 * Constant DASHBOARD_PANEL_SLOT
 * @const DASHBOARD_PANEL_SLOT
 *
 * @description
 * Mono-active slot for the contextual column at the right of the shell — a
 * record's properties, a conversation's details, an assistant. At most one
 * contribution is on screen: the highest-priority one whose `active` signal is
 * true.
 *
 * The shell owns its responsive, resizable geometry; the active feature owns
 * the content and its accessible label.
 *
 * @since 1.0.0
 *
 * @type {InjectionToken<DashboardPanelContribution[]>}
 */
export const DASHBOARD_PANEL_SLOT: InjectionToken<DashboardPanelContribution[]> =
  new InjectionToken<DashboardPanelContribution[]>('DASHBOARD_PANEL_SLOT');
