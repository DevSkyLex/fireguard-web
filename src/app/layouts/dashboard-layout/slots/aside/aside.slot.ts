import { InjectionToken } from '@angular/core';
import type { AsideContribution } from './aside-contribution.interface';

/**
 * Constant ASIDE_SLOT
 * @const ASIDE_SLOT
 *
 * @description
 * Provides the aside slot value.
 *
 * @since 1.0.0
 *
 * @type {InjectionToken<AsideContribution[]>}
 */
export const ASIDE_SLOT: InjectionToken<AsideContribution[]> = new InjectionToken<
  AsideContribution[]
>('ASIDE_SLOT');
