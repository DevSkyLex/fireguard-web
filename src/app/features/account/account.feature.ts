import {
  effect,
  inject,
  makeEnvironmentProviders,
  provideAppInitializer,
  untracked,
  type EnvironmentProviders,
  type Provider,
} from '@angular/core';
import {
  NOTIFICATION_CENTER_PORT,
  USER_ACCESS_PORT,
  USER_IDENTITY_PORT,
  USER_PROFILE_PORT,
  type NotificationCenterPort,
  type UserIdentityPort,
} from '@features/account/ports';
import { NotificationStore, UserStore } from '@features/account/state';

/**
 * Interface AccountFeature
 *
 * @description
 * Represents an optional feature that can be composed into `provideAccountFeature()`.
 * Follows the Angular `RouterFeature` / `HttpClientFeature` pattern where `with*`
 * functions return a feature object that is spread into the provider list.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface AccountFeature {
  providers: Provider[];
}

/**
 * Provider provideAccountFeature
 *
 * @description
 * Provides the account feature. Binds the account-owned port tokens
 * (`USER_IDENTITY_PORT`, `USER_ACCESS_PORT`, `NOTIFICATION_CENTER_PORT`) to their
 * concrete implementations (`UserStore`, `NotificationStore`) so that shell
 * consumers such as layouts can inject the ports instead of the concrete stores.
 *
 * Accepts optional `AccountFeature` objects (e.g. `withAccountNavigation()`) to
 * compose additional providers into the environment.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @example
 * ```typescript
 * provideAccountFeature(withAccountNavigation())
 * ```
 */
export function provideAccountFeature(...features: AccountFeature[]): EnvironmentProviders {
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
      const userIdentityPort: UserIdentityPort =
        inject<UserIdentityPort>(USER_IDENTITY_PORT);

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

      // Initialize the notification center if the user is already authenticated
      effect((): void => {
        if (userIdentityPort.profile()) {
          untracked((): void => {
            notificationCenterPort
              .initialize()
              .then((): void => notificationCenterPort.connectMercure());
          });
        }
      });
    }),
    ...features.flatMap((f) => f.providers),
  ]);
}
