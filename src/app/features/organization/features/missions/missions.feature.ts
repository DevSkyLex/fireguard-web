import {
  inject,
  makeEnvironmentProviders,
  provideAppInitializer,
  type EnvironmentProviders,
} from '@angular/core';
import { MissionPwaUpdateService } from './services';

/**
 * Function provideMissionsFeature
 *
 * @description
 * Registers mission-scoped bootstrap providers.
 *
 * Currently this initializer starts the PWA update workflow dedicated to
 * field missions. The workflow is initialized once at app startup and keeps
 * mission offline outbox integrity by preventing reload prompts while local
 * unsynchronized operations exist.
 *
 * @returns {EnvironmentProviders} Feature-level providers for mission startup.
 *
 * @since 1.0.0
 */
export function provideMissionsFeature(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideAppInitializer(() => inject(MissionPwaUpdateService).start()),
  ]);
}
