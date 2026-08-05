import { InjectionToken } from '@angular/core';
import type { SlotContribution } from '@shared/layout-slot';

/**
 * Constant FOCUSED_HEADER_SLOT
 * @const FOCUSED_HEADER_SLOT
 *
 * @description
 * Additive slot for the top chrome of the focused shell — the brand lockup, a
 * way back into the application, the theme switcher.
 *
 * @since 1.0.0
 *
 * @type {InjectionToken<SlotContribution[]>}
 */
export const FOCUSED_HEADER_SLOT: InjectionToken<SlotContribution[]> = new InjectionToken<
  SlotContribution[]
>('FOCUSED_HEADER_SLOT');
