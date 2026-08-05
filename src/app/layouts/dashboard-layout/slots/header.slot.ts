import { InjectionToken } from '@angular/core';
import type { SlotContribution } from '@shared/layout-slot';

/**
 * Constant DASHBOARD_HEADER_SLOT
 * @const DASHBOARD_HEADER_SLOT
 *
 * @description
 * Additive slot filling the header from the sidebar trigger rightwards — the
 * breadcrumb trail, the page title, contextual status.
 *
 * @since 1.0.0
 *
 * @type {InjectionToken<SlotContribution[]>}
 */
export const DASHBOARD_HEADER_SLOT: InjectionToken<SlotContribution[]> = new InjectionToken<
  SlotContribution[]
>('DASHBOARD_HEADER_SLOT');
