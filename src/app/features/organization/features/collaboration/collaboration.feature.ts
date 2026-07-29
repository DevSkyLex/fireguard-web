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
 * Function provideCollaborationFeature
 * @function provideCollaborationFeature
 *
 * @description
 * Starts the messaging outbox coordinator at app startup, so queued messages
 * leave as soon as connectivity returns — including on a cold boot where the
 * member never opens the conversation they wrote in.
 *
 * Started from an app initializer rather than from the workspace route on
 * purpose: a message queued yesterday must not wait for someone to navigate
 * back to its channel.
 *
 * Also arms the offline lifecycle, which wipes the local conversation database
 * when the session ends. Both listeners must exist before any route does, since
 * a member can sign out from anywhere in the shell.
 *
 * Imported dynamically: the two services drag in the messaging IndexedDB layer and
 * the sync coordinator, which a static import welded into the initial bundle for
 * every visitor — including the ones who only ever reach a login screen. The
 * behaviour is unchanged; only the moment the code arrives is.
 *
 * Browser-only: IndexedDB and connectivity work has no meaning during SSR.
 *
 * @since 1.1.0
 *
 * @return {EnvironmentProviders} Feature-level providers for messaging startup.
 */
export function provideCollaborationFeature(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideAppInitializer(() => {
      if (!isPlatformBrowser(inject<object>(PLATFORM_ID))) return;

      const injector: EnvironmentInjector = inject(EnvironmentInjector);

      // Deliberately not awaited: draining an outbox must not hold up first paint.
      void import('./services').then((services) => {
        runInInjectionContext(injector, () => {
          inject(services.MessagingSyncCoordinatorService).start();
          inject(services.MessagingOfflineLifecycleService).start();
        });
      });
    }),
  ]);
}
