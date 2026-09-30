import {
  type EnvironmentProviders,
  inject,
  makeEnvironmentProviders,
  provideAppInitializer,
} from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { ENV_CONFIG } from '@core/config/environment';
import { type EnvironmentConfig } from '@core/config/environment';

/**
 * Constant MaintenanceStore
 *
 * @description
 * Tracks whether the application is in maintenance mode, activated at startup from
 * environment configuration or dynamically after an API 503 response.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @constant MaintenanceStore
 */
export const MaintenanceStore = signalStore(
  { providedIn: 'root' },
  withState({ isActive: false }),
  withMethods((store) => ({
    /**
     * Method activate
     *
     * @description
     * Marks the application as being in maintenance mode.
     */
    activate(): void {
      patchState(store, { isActive: true });
    },

    /**
     * Method deactivate
     *
     * @description
     * Clears the maintenance mode flag.
     */
    deactivate(): void {
      patchState(store, { isActive: false });
    },
  })),
);

/**
 * Type MaintenanceStore
 *
 * @description
 * Instance type of the root-provided maintenance status store.
 *
 * @since 0.1.0
 *
 * @type {InstanceType<typeof MaintenanceStore>}
 */
export type MaintenanceStore = InstanceType<typeof MaintenanceStore>;

/**
 * Function provideMaintenanceMode
 *
 * @description
 * Registers an app initializer that activates maintenance mode at startup
 * when the environment config has `maintenanceMode: true`.
 *
 * @returns {EnvironmentProviders}
 */
export function provideMaintenanceMode(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideAppInitializer(() => {
      const env: EnvironmentConfig = inject<EnvironmentConfig>(ENV_CONFIG);
      const store: MaintenanceStore = inject<MaintenanceStore>(MaintenanceStore);

      if (env.maintenance) {
        store.activate();
      }
    }),
  ]);
}
