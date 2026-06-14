import { InjectionToken } from '@angular/core';
import type { NavigationContribution } from './navigation-contribution.interface';

/**
 * Constant NAVIGATION_SLOT
 * @const NAVIGATION_SLOT
 *
 * @description
 * Provides the navigation slot value.
 *
 * @since 1.0.0
 *
 * @type {InjectionToken<NavigationContribution[]>}
 */
export const NAVIGATION_SLOT: InjectionToken<NavigationContribution[]> = new InjectionToken<
  NavigationContribution[]
>('NAVIGATION_SLOT');
