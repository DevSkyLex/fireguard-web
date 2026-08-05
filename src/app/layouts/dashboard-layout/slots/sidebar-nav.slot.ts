import { InjectionToken } from '@angular/core';
import type { SlotContribution } from '@shared/layout-slot';

/**
 * Constant DASHBOARD_SIDEBAR_NAV_SLOT
 * @const DASHBOARD_SIDEBAR_NAV_SLOT
 *
 * @description
 * Additive slot for the scrolling body of the sidebar. Each feature publishes
 * its own navigation group, stacked by `order`, rather than the layout owning
 * one monolithic menu.
 *
 * @since 1.0.0
 *
 * @type {InjectionToken<SlotContribution[]>}
 */
export const DASHBOARD_SIDEBAR_NAV_SLOT: InjectionToken<SlotContribution[]> = new InjectionToken<
  SlotContribution[]
>('DASHBOARD_SIDEBAR_NAV_SLOT');
