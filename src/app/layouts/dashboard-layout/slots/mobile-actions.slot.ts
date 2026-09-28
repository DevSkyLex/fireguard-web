import { InjectionToken } from '@angular/core';
import type { SlotContribution } from '@shared/layout-slot';

/**
 * Constant DASHBOARD_MOBILE_ACTIONS_SLOT
 * @const DASHBOARD_MOBILE_ACTIONS_SLOT
 * @description Additive feature tools available in the mobile quick-actions drawer.
 * @since 1.0.0
 * @type {InjectionToken<SlotContribution[]>}
 */
export const DASHBOARD_MOBILE_ACTIONS_SLOT: InjectionToken<SlotContribution[]> = new InjectionToken<
  SlotContribution[]
>('DASHBOARD_MOBILE_ACTIONS_SLOT');
