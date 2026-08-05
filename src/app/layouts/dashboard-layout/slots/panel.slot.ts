import { InjectionToken } from '@angular/core';
import type { ExclusiveSlotContribution } from '@shared/layout-slot';

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
 * @since 1.0.0
 *
 * @type {InjectionToken<ExclusiveSlotContribution[]>}
 */
export const DASHBOARD_PANEL_SLOT: InjectionToken<ExclusiveSlotContribution[]> = new InjectionToken<
  ExclusiveSlotContribution[]
>('DASHBOARD_PANEL_SLOT');
