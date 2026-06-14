import {
  inject,
  makeEnvironmentProviders,
  provideAppInitializer,
  type EnvironmentProviders,
} from '@angular/core';
import {
  MissionOfflineLifecycleService,
  MissionPrefetchService,
  MissionPwaUpdateService,
  MissionSyncCoordinatorService,
} from './services';

/**
 * Function provideMissionsFeature
 * @function provideMissionsFeature
 *
 * @description
 * Registers mission-scoped bootstrap providers, started once at app startup:
 *
 * - `MissionPwaUpdateService` — keeps mission offline outbox integrity by
 *   preventing reload prompts while local unsynchronized operations exist,
 * - `MissionPrefetchService` — warms locally persisted mission workspaces,
 * - `MissionSyncCoordinatorService` — replays the outbox when connectivity or
 *   page visibility is regained.
 *
 * @since 1.0.0
 *
 * @return {EnvironmentProviders} Feature-level providers for mission startup.
 */
export function provideMissionsFeature(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideAppInitializer(() => {
      inject(MissionOfflineLifecycleService).start();
      inject(MissionPwaUpdateService).start();
      inject(MissionPrefetchService).start();
      inject(MissionSyncCoordinatorService).start();
    }),
  ]);
}
