import {
  type InjectionToken,
  makeEnvironmentProviders,
  type EnvironmentProviders,
  type Provider,
} from '@angular/core';
import { SPLIT_LAYOUT_CONTENT_MAX_WIDTH } from '../../slots/content';
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
  /**
   * Tailwind max-width utility for the content column (e.g. `max-w-4xl`).
   * Overrides the default `max-w-3xl` for routes that need a wider column.
   */
  readonly contentMaxWidth?: string;
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
  const providers: Provider[] = [...provideSlotContributions(SHOWCASE_SLOT, config.showcase)];

  if (config.contentMaxWidth !== undefined) {
    providers.push({
      provide: SPLIT_LAYOUT_CONTENT_MAX_WIDTH,
      useValue: config.contentMaxWidth,
    });
  }

  return makeEnvironmentProviders(providers);
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
