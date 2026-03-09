import {
  type EnvironmentProviders,
  inject,
  makeEnvironmentProviders,
  provideAppInitializer,
} from '@angular/core';
import { SplashScreenService } from './splash-screen.service';

/**
 * Provider provideSplashScreen
 *
 * @description
 * Provides the SplashScreenService and eagerly initializes it
 * so that router event listeners are attached on startup.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export function provideSplashScreen(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideAppInitializer(() => {
      inject<SplashScreenService>(SplashScreenService);
    }),
  ]);
}
