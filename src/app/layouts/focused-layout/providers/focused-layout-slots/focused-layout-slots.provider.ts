import { type EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { type AdditiveSlotFeature, provideSlotContributions } from '@shared/layout-slot';
import { FOCUSED_FOOTER_SLOT, FOCUSED_HEADER_SLOT } from '../../slots';

/**
 * Interface FocusedLayoutSlotsConfig
 * @interface FocusedLayoutSlotsConfig
 *
 * @description
 * Declarative composition of the focused shell. Omitting a region leaves it
 * empty, and the layout renders no chrome for it.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface FocusedLayoutSlotsConfig {
  /** Top chrome. */
  readonly header?: readonly AdditiveSlotFeature[];
  /** Bottom chrome. */
  readonly footer?: readonly AdditiveSlotFeature[];
}

/**
 * Function provideFocusedLayoutSlots
 * @function provideFocusedLayoutSlots
 *
 * @description
 * Registers the contributions of a route served by {@link FocusedLayout}.
 * Declare it in that route's `providers`.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {FocusedLayoutSlotsConfig} config - Contributions grouped by region.
 *
 * @returns {EnvironmentProviders} Providers to declare on the route hosting the shell.
 *
 * @example
 * ```typescript
 * providers: [provideFocusedLayoutSlots({ header: [withBrandLockup()] })]
 * ```
 */
export function provideFocusedLayoutSlots(config: FocusedLayoutSlotsConfig): EnvironmentProviders {
  return makeEnvironmentProviders([
    ...provideSlotContributions(FOCUSED_HEADER_SLOT, config.header),
    ...provideSlotContributions(FOCUSED_FOOTER_SLOT, config.footer),
  ]);
}
