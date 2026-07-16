import { InjectionToken } from '@angular/core';
import type { SidebarContribution } from './sidebar-contribution.interface';

/**
 * Constant SIDEBAR_SLOT
 * @const SIDEBAR_SLOT
 *
 * @description
 * Provides the sidebar slot value.
 *
 * @since 1.0.0
 *
 * @type {InjectionToken<SidebarContribution[]>}
 */
export const SIDEBAR_SLOT: InjectionToken<SidebarContribution[]> = new InjectionToken<
  SidebarContribution[]
>('SIDEBAR_SLOT');
