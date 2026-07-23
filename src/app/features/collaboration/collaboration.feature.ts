import {
  inject,
  makeEnvironmentProviders,
  provideAppInitializer,
  type EnvironmentProviders,
} from '@angular/core';
import { MessagingSyncCoordinatorService } from './services';

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
 * @since 1.0.0
 *
 * @return {EnvironmentProviders} Feature-level providers for messaging startup.
 */
export function provideCollaborationFeature(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideAppInitializer(() => {
      inject<MessagingSyncCoordinatorService>(MessagingSyncCoordinatorService).start();
    }),
  ]);
}
