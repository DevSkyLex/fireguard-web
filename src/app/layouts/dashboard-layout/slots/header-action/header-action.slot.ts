import { InjectionToken } from '@angular/core';
import type { HeaderActionContribution } from './header-action-contribution.interface';

/**
 * Constant HEADER_ACTION_SLOT
 * @const HEADER_ACTION_SLOT
 *
 * @description
 * Multi-provider injection token defining the dashboard header action bar
 * extension point. Features register by declaring a
 * `{ provide: HEADER_ACTION_SLOT, useFactory: ..., multi: true }`
 * provider in their own `withXxx()` function. The layout resolves the full
 * array, sorts by `order`, and renders each component via `NgComponentOutlet`.
 *
 * @type {InjectionToken<HeaderActionContribution[]>}
 */
export const HEADER_ACTION_SLOT: InjectionToken<HeaderActionContribution[]> = new InjectionToken<
  HeaderActionContribution[]
>('HEADER_ACTION_SLOT');
