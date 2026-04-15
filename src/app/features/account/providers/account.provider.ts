import { type EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import {
  NOTIFICATION_CENTER_PORT,
  USER_IDENTITY_PORT,
  USER_PROFILE_PORT,
} from '@features/account/ports';
import { NotificationStore } from '@features/account/state';
import { UserStore } from '@features/account/state';

/**
 * Provider provideAccount
 *
 * @description
 * Provides the account feature ports. Binds the account-owned port tokens
 * (`USER_IDENTITY_PORT`, `NOTIFICATION_CENTER_PORT`) to their concrete
 * implementations (`UserStore`, `NotificationStore`) so that shell consumers
 * such as layouts can inject the ports instead of the concrete stores.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export function provideAccount(): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: USER_IDENTITY_PORT,
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
  ]);
}
