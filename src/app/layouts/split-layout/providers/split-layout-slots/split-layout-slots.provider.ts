import {
  type InjectionToken,
  makeEnvironmentProviders,
  type EnvironmentProviders,
  type Provider,
} from '@angular/core';
import { SHOWCASE_SLOT, type ShowcaseContribution } from '../../slots/showcase';

/**
 * SplitLayoutSlotFeature
 *
 * @description
 * Common contract returned by split layout slot contribution factories.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface SplitLayoutSlotFeature<TContribution> {
  useFactory: () => TContribution;
}

export type SplitLayoutShowcaseSlotFeature = SplitLayoutSlotFeature<ShowcaseContribution>;

/**
 * SplitLayoutSlotsConfig
 *
 * @description
 * Declarative split layout slot composition.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface SplitLayoutSlotsConfig {
  readonly showcase?: SplitLayoutShowcaseSlotFeature[];
}

/**
 * Provider provideSplitLayoutSlots
 *
 * @description
 * Provides all configured split layout slot contributions.
 *
 * @param {SplitLayoutSlotsConfig} config - Slot contributions grouped by layout area.
 * @returns {EnvironmentProviders}
 *
 * @since 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export function provideSplitLayoutSlots(config: SplitLayoutSlotsConfig): EnvironmentProviders {
  return makeEnvironmentProviders([...provideSlotContributions(SHOWCASE_SLOT, config.showcase)]);
}

function provideSlotContributions<TContribution>(
  token: InjectionToken<TContribution[]>,
  features: readonly SplitLayoutSlotFeature<TContribution>[] = [],
): Provider[] {
  return features.map(
    (feature: SplitLayoutSlotFeature<TContribution>): Provider => ({
      provide: token,
      useFactory: feature.useFactory,
      multi: true,
    }),
  );
}
