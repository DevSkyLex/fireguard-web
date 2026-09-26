import { isPlatformBrowser } from '@angular/common';
import {
  effect,
  inject,
  makeEnvironmentProviders,
  provideAppInitializer,
  PLATFORM_ID,
  untracked,
  type EnvironmentProviders,
} from '@angular/core';
import {
  NOTIFICATION_CENTER_PORT,
  USER_ACCESS_PORT,
  USER_IDENTITY_PORT,
  USER_PROFILE_PORT,
  type NotificationCenterPort,
  type UserIdentityPort,
} from '@features/account/ports';
import { PresencePreferenceCoordinatorService } from '@features/account/services/presence-preference-coordinator';
import { NotificationStore, UserStore } from '@features/account/state';

/**
 * Provider provideAccountFeature
 *
 * @description
 * Provides the account feature. Binds the account-owned port tokens
 * (`USER_IDENTITY_PORT`, `USER_ACCESS_PORT`, `NOTIFICATION_CENTER_PORT`) to their
 * concrete implementations (`UserStore`, `NotificationStore`) so that shell
 * consumers such as layouts can inject the ports instead of the concrete stores.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 * @returns {EnvironmentProviders} Account ports and browser realtime initialization.
 *
 * @example
 * ```typescript
 * provideAccountFeature()
 * ```
 */
export function provideAccountFeature(): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: USER_IDENTITY_PORT,
      useExisting: UserStore,
    },
    {
      provide: USER_ACCESS_PORT,
      useExisting: UserStore,
    },
    {
      provide: USER_PROFILE_PORT,
      useExisting: UserStore,
    },
    {
      provide: NOTIFICATION_CENTER_PORT,
      useExisting: NotificationStore,
    },
    provideAppInitializer((): void => {
      if (!isPlatformBrowser(inject(PLATFORM_ID))) return;
      inject(PresencePreferenceCoordinatorService);
      /**
       * Constant userIdentityPort
       * @const userIdentityPort
       *
       * @description
       * Local constant to read the user identity port once and
       * avoid injecting it multiple times in the effect below, which
       * would be inefficient and potentially cause issues with circular
       * dependencies.
       *
       * @type {UserIdentityPort}
       */
      const userIdentityPort: UserIdentityPort = inject<UserIdentityPort>(USER_IDENTITY_PORT);

      /**
       * Constant notificationCenterPort
       * @const notificationCenterPort
       *
       * @description
       * Local constant to read the notification center port once and
       * avoid injecting it multiple times in the effect below, which
       * would be inefficient and potentially cause issues with circular
       * dependencies.
       *
       * @type {NotificationCenterPort}
       */
      const notificationCenterPort: NotificationCenterPort =
        inject<NotificationCenterPort>(NOTIFICATION_CENTER_PORT);

      effect((): void => {
        if (!userIdentityPort.profile()) {
          return;
        }

        untracked((): void => notificationCenterPort.connectMercure());
      });
    }),
  ]);
}
