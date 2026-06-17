import {
  inject,
  makeEnvironmentProviders,
  provideAppInitializer,
  type EnvironmentProviders,
} from '@angular/core';
import {
  InterventionOfflineLifecycleService,
  InterventionPrefetchService,
  InterventionPwaUpdateService,
  InterventionSyncCoordinatorService,
} from './services';

/**
 * Function provideInterventionsFeature
 * @function provideInterventionsFeature
 *
 * @description
 * Registers intervention-scoped bootstrap providers, started once at app startup:
 *
 * - `InterventionPwaUpdateService` — keeps intervention offline outbox integrity by
 *   preventing reload prompts while local unsynchronized operations exist,
 * - `InterventionPrefetchService` — warms locally persisted intervention workspaces,
 * - `InterventionSyncCoordinatorService` — replays the outbox when connectivity or
 *   page visibility is regained.
 *
 * @since 1.0.0
 *
 * @return {EnvironmentProviders} Feature-level providers for intervention startup.
 */
export function provideInterventionsFeature(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideAppInitializer(() => {
      inject<InterventionOfflineLifecycleService>(InterventionOfflineLifecycleService).start();
      inject<InterventionPwaUpdateService>(InterventionPwaUpdateService).start();
      inject<InterventionPrefetchService>(InterventionPrefetchService).start();
      inject<InterventionSyncCoordinatorService>(InterventionSyncCoordinatorService).start();
    }),
  ]);
}
