import type { InjectionToken, Provider } from '@angular/core';
import type { SlotFeature } from './models';

/**
 * Function provideSlotContributions
 * @function provideSlotContributions
 *
 * @description
 * Binds a list of `with<Thing>()` factories to one slot token as multi
 * providers. Each layout's own `provide<Name>LayoutSlots()` composes one call
 * per slot it publishes.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {InjectionToken<TContribution[]>} token - The slot token to feed.
 * @param {readonly SlotFeature<TContribution>[]} [features] - Contribution factories.
 *
 * @returns {Provider[]} Multi providers for the token, empty when nothing is contributed.
 */
export function provideSlotContributions<TContribution>(
  token: InjectionToken<TContribution[]>,
  features: readonly SlotFeature<TContribution>[] = [],
): Provider[] {
  return features.map((feature: SlotFeature<TContribution>): Provider => ({
    provide: token,
    useFactory: feature.useFactory,
    multi: true,
  }));
}
