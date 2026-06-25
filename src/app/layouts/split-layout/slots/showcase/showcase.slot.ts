import { InjectionToken } from '@angular/core';
import type { ShowcaseContribution } from './showcase-contribution.interface';

/**
 * Constant SHOWCASE_SLOT
 * @const SHOWCASE_SLOT
 *
 * @description
 * Multi-provider injection token collecting every showcase contribution
 * registered for the split layout left panel.
 *
 * @since 1.0.0
 *
 * @type {InjectionToken<ShowcaseContribution[]>}
 */
export const SHOWCASE_SLOT: InjectionToken<ShowcaseContribution[]> = new InjectionToken<
  ShowcaseContribution[]
>('SHOWCASE_SLOT');
