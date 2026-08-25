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
 * **No route contributes to it today.** It is reserved rather than dead: a
 * right-hand column belongs here, never in a page-local grid, so the first
 * surface that needs one has a single place to put it. The assistant carries
 * its own sheet instead, which is why the slot has stayed empty this long.
 * Read that emptiness as "not claimed yet", not as "unused, delete me".
 *
 * @since 1.0.0
 *
 * @type {InjectionToken<ExclusiveSlotContribution[]>}
 */
export const DASHBOARD_PANEL_SLOT: InjectionToken<ExclusiveSlotContribution[]> = new InjectionToken<
  ExclusiveSlotContribution[]
>('DASHBOARD_PANEL_SLOT');
