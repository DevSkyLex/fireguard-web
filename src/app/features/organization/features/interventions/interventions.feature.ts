import { isPlatformBrowser } from '@angular/common';
import {
  EnvironmentInjector,
  inject,
  makeEnvironmentProviders,
  PLATFORM_ID,
  provideAppInitializer,
  runInInjectionContext,
  type EnvironmentProviders,
} from '@angular/core';

/**
 * Function provideInterventionsFeature
 * @function provideInterventionsFeature
 *
 * @description
 * Registers intervention-scoped bootstrap providers, started once at app startup:
 *
 * - `InterventionOfflineLifecycleService` — purges locally persisted intervention
 *   data when the session ends,
 * - `InterventionPwaUpdateService` — keeps intervention offline outbox integrity by
 *   preventing reload prompts while local unsynchronized operations exist,
 * - `InterventionPrefetchService` — warms locally persisted intervention workspaces,
 * - `InterventionSyncCoordinatorService` — replays the outbox when connectivity or
 *   page visibility is regained.
 *
 * These must run without anyone visiting an intervention route — work queued
 * yesterday has to leave on a cold boot — but they pull in the whole offline graph:
 * IndexedDB repositories, the sync coordinator, the prefetcher. A static import
 * welded all of that into the initial bundle for every visitor, including the ones
 * who only ever reach a login screen. Importing dynamically keeps the behaviour and
 * moves the code off the critical path.
 *
 * Browser-only: this is IndexedDB, service-worker and connectivity work with no
 * meaning while rendering on the server.
 *
 * @since 1.1.0
 *
 * @return {EnvironmentProviders} Feature-level providers for intervention startup.
 */
export function provideInterventionsFeature(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideAppInitializer(() => {
      if (!isPlatformBrowser(inject<object>(PLATFORM_ID))) return;

      const injector: EnvironmentInjector = inject(EnvironmentInjector);

      // Deliberately not awaited: draining an outbox must not hold up first paint.
      void import('./services').then((services) => {
        runInInjectionContext(injector, () => {
          inject(services.InterventionOfflineLifecycleService).start();
          inject(services.InterventionPwaUpdateService).start();
          inject(services.InterventionPrefetchService).start();
          inject(services.InterventionSyncCoordinatorService).start();
        });
      });
    }),
  ]);
}
