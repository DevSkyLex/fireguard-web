import { InjectionToken } from '@angular/core';
import type { RailContribution } from './rail-contribution.interface';

/**
 * Constant RAIL_SLOT
 * @const RAIL_SLOT
 *
 * @description
 * Multi-provider injection token collecting every contribution registered for
 * the workspace rail.
 *
 * @since 1.0.0
 *
 * @type {InjectionToken<RailContribution[]>}
 */
export const RAIL_SLOT: InjectionToken<RailContribution[]> = new InjectionToken<RailContribution[]>(
  'RAIL_SLOT',
);
