import { InjectionToken } from '@angular/core';
import type { SidebarExtensionContribution } from '../models';

/**
 * Constant DASHBOARD_SIDEBAR_EXTENSION_SLOT
 * @const DASHBOARD_SIDEBAR_EXTENSION_SLOT
 *
 * @description
 * Exclusive contextual navigation beside the primary sidebar. The highest
 * active priority wins; features own content and mobile route selection.
 *
 * @since 1.0.0
 * @type {InjectionToken<SidebarExtensionContribution[]>}
 */
export const DASHBOARD_SIDEBAR_EXTENSION_SLOT: InjectionToken<SidebarExtensionContribution[]> =
  new InjectionToken<SidebarExtensionContribution[]>('DASHBOARD_SIDEBAR_EXTENSION_SLOT');
