import { InjectionToken } from '@angular/core';
import type { SlotContribution } from '@shared/layout-slot';

/**
 * Constant DASHBOARD_HEADER_ACTIONS_SLOT
 * @const DASHBOARD_HEADER_ACTIONS_SLOT
 *
 * @description
 * Additive slot for the tool cluster at the right of the header — the
 * notification bell, the theme switcher, the account menu, page actions.
 *
 * @since 1.0.0
 *
 * @type {InjectionToken<SlotContribution[]>}
 */
export const DASHBOARD_HEADER_ACTIONS_SLOT: InjectionToken<SlotContribution[]> = new InjectionToken<
  SlotContribution[]
>('DASHBOARD_HEADER_ACTIONS_SLOT');
