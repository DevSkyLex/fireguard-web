import { InjectionToken } from '@angular/core';
import type { SecondaryNavContribution } from './secondary-nav-contribution.interface';

/**
 * Constant SECONDARY_NAV_SLOT
 * @const SECONDARY_NAV_SLOT
 *
 * @description
 * Multi-provider injection token collecting every section registered for the
 * workspace channel sidebar.
 *
 * @since 1.0.0
 *
 * @type {InjectionToken<SecondaryNavContribution[]>}
 */
export const SECONDARY_NAV_SLOT: InjectionToken<SecondaryNavContribution[]> = new InjectionToken<
  SecondaryNavContribution[]
>('SECONDARY_NAV_SLOT');
