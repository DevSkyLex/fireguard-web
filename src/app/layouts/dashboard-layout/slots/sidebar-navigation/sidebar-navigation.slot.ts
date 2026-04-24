import { InjectionToken } from '@angular/core';
import type { SidebarNavigationContribution } from './sidebar-navigation-contribution.interface';

/**
 * Constant SIDEBAR_NAVIGATION_SLOT
 * @const SIDEBAR_NAVIGATION_SLOT
 *
 * @description
 * Multi-provider injection token defining the dashboard primary sidebar
 * navigation extension point. Features register by declaring a
 * `{ provide: SIDEBAR_NAVIGATION_SLOT, useFactory: ..., multi: true }`
 * provider in their own `provideXxx()` function. The layout resolves the full
 * array, sorts by `order`, and builds the final `MenuItem[]` tree.
 *
 * @type {InjectionToken<SidebarNavigationContribution[]>}
 */
export const SIDEBAR_NAVIGATION_SLOT: InjectionToken<SidebarNavigationContribution[]> =
  new InjectionToken<SidebarNavigationContribution[]>('SIDEBAR_NAVIGATION_SLOT');
