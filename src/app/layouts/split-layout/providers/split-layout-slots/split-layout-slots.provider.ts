import { type EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import {
  type AdditiveSlotFeature,
  type ExclusiveSlotFeature,
  provideSlotContributions,
} from '@shared/layout-slot';
import { SPLIT_FOOTER_SLOT, SPLIT_HEADER_SLOT, SPLIT_SHOWCASE_SLOT } from '../../slots';

/**
 * Interface SplitLayoutSlotsConfig
 * @interface SplitLayoutSlotsConfig
 *
 * @description
 * Declarative composition of the split shell, grouped by region. Omitting a
 * region leaves it empty, and the layout renders no chrome for it.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface SplitLayoutSlotsConfig {
  /** Mono-active branded panel. */
  readonly showcase?: readonly ExclusiveSlotFeature[];
  /** Chrome floating above the form column. */
  readonly header?: readonly AdditiveSlotFeature[];
  /** Chrome pinned below the form column. */
  readonly footer?: readonly AdditiveSlotFeature[];
}

/**
 * Function provideSplitLayoutSlots
 * @function provideSplitLayoutSlots
 *
 * @description
 * Registers the contributions of a route served by {@link SplitLayout}. Declare
 * it in that route's `providers`, so two routes sharing the shell can dress it
 * differently.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {SplitLayoutSlotsConfig} config - Contributions grouped by region.
 *
 * @returns {EnvironmentProviders} Providers to declare on the route hosting the shell.
 *
 * @example
 * ```typescript
 * providers: [provideSplitLayoutSlots({ showcase: [withAuthShowcase()] })]
 * ```
 */
export function provideSplitLayoutSlots(config: SplitLayoutSlotsConfig): EnvironmentProviders {
  return makeEnvironmentProviders([
    ...provideSlotContributions(SPLIT_SHOWCASE_SLOT, config.showcase),
    ...provideSlotContributions(SPLIT_HEADER_SLOT, config.header),
    ...provideSlotContributions(SPLIT_FOOTER_SLOT, config.footer),
  ]);
}
