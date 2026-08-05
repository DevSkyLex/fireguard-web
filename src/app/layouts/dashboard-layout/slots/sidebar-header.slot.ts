import { InjectionToken } from '@angular/core';
import type { SlotContribution } from '@shared/layout-slot';

/**
 * Constant DASHBOARD_SIDEBAR_HEADER_SLOT
 * @const DASHBOARD_SIDEBAR_HEADER_SLOT
 *
 * @description
 * Additive slot at the top of the sidebar — the brand lockup, the organization
 * switcher, a search entry point.
 *
 * @since 1.0.0
 *
 * @type {InjectionToken<SlotContribution[]>}
 */
export const DASHBOARD_SIDEBAR_HEADER_SLOT: InjectionToken<SlotContribution[]> = new InjectionToken<
  SlotContribution[]
>('DASHBOARD_SIDEBAR_HEADER_SLOT');
