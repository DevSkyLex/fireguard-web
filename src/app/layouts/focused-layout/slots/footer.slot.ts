import { InjectionToken } from '@angular/core';
import type { SlotContribution } from '@shared/layout-slot';

/**
 * Constant FOCUSED_FOOTER_SLOT
 * @const FOCUSED_FOOTER_SLOT
 *
 * @description
 * Additive slot for the bottom chrome of the focused shell — support contact,
 * legal links, build stamp.
 *
 * @since 1.0.0
 *
 * @type {InjectionToken<SlotContribution[]>}
 */
export const FOCUSED_FOOTER_SLOT: InjectionToken<SlotContribution[]> = new InjectionToken<
  SlotContribution[]
>('FOCUSED_FOOTER_SLOT');
