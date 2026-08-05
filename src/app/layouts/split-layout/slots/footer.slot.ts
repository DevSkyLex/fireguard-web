import { InjectionToken } from '@angular/core';
import type { SlotContribution } from '@shared/layout-slot';

/**
 * Constant SPLIT_FOOTER_SLOT
 * @const SPLIT_FOOTER_SLOT
 *
 * @description
 * Additive slot pinned to the bottom of the form column — legal links, support
 * contact, build stamp.
 *
 * @since 1.0.0
 *
 * @type {InjectionToken<SlotContribution[]>}
 */
export const SPLIT_FOOTER_SLOT: InjectionToken<SlotContribution[]> = new InjectionToken<
  SlotContribution[]
>('SPLIT_FOOTER_SLOT');
