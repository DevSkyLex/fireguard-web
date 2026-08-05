import { InjectionToken } from '@angular/core';
import type { SlotContribution } from '@shared/layout-slot';

/**
 * Constant SPLIT_HEADER_SLOT
 * @const SPLIT_HEADER_SLOT
 *
 * @description
 * Additive slot for the chrome floating above the form column — the brand
 * lockup, the theme switcher, a locale picker.
 *
 * @since 1.0.0
 *
 * @type {InjectionToken<SlotContribution[]>}
 */
export const SPLIT_HEADER_SLOT: InjectionToken<SlotContribution[]> = new InjectionToken<
  SlotContribution[]
>('SPLIT_HEADER_SLOT');
