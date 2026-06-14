import { InjectionToken } from '@angular/core';
import type { TopbarContribution } from './topbar-contribution.interface';

/**
 * Constant TOPBAR_SLOT
 * @const TOPBAR_SLOT
 *
 * @description
 * Provides the topbar slot value.
 *
 * @since 1.0.0
 *
 * @type {InjectionToken<TopbarContribution[]>}
 */
export const TOPBAR_SLOT: InjectionToken<TopbarContribution[]> = new InjectionToken<
  TopbarContribution[]
>('TOPBAR_SLOT');
