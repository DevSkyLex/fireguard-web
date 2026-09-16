import { InjectionToken } from '@angular/core';
import type { SlotContribution } from '@shared/layout-slot';

/**
 * Constant DASHBOARD_MOBILE_NAVIGATION_SLOT
 * @const DASHBOARD_MOBILE_NAVIGATION_SLOT
 * @description Additive feature navigation rendered in the mobile shell's reserved bottom band.
 * @access public
 * @since 1.0.0
 * @type {InjectionToken<SlotContribution[]>}
 */
export const DASHBOARD_MOBILE_NAVIGATION_SLOT: InjectionToken<SlotContribution[]> =
  new InjectionToken<SlotContribution[]>('DASHBOARD_MOBILE_NAVIGATION_SLOT');
