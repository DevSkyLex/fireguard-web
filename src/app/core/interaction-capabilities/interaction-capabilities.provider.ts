import {
  inject,
  makeEnvironmentProviders,
  provideAppInitializer,
  type EnvironmentProviders,
} from '@angular/core';
import { INTERACTION_CAPABILITIES_PORT } from './ports';
import { InteractionCapabilitiesService } from './services/interaction-capabilities/interaction-capabilities.service';

/**
 * Function provideInteractionCapabilities
 * @description Binds the core adapter and starts its hydration-safe initialization.
 * @access public
 * @since 1.0.0
 * @returns {EnvironmentProviders} App-wide initialization and single-instance port binding.
 */
export function provideInteractionCapabilities(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: INTERACTION_CAPABILITIES_PORT, useExisting: InteractionCapabilitiesService },
    provideAppInitializer(() => {
      inject(INTERACTION_CAPABILITIES_PORT);
    }),
  ]);
}
