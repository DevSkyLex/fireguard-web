import { InjectionToken } from '@angular/core';
import type { SlotContribution } from '@shared/layout-slot';

/**
 * Constant DASHBOARD_SIDEBAR_FOOTER_SLOT
 * @const DASHBOARD_SIDEBAR_FOOTER_SLOT
 *
 * @description
 * Additive slot pinned to the bottom of the sidebar — the account menu, a
 * storage or quota indicator, a support link.
 *
 * @since 1.0.0
 *
 * @type {InjectionToken<SlotContribution[]>}
 */
export const DASHBOARD_SIDEBAR_FOOTER_SLOT: InjectionToken<SlotContribution[]> = new InjectionToken<
  SlotContribution[]
>('DASHBOARD_SIDEBAR_FOOTER_SLOT');
