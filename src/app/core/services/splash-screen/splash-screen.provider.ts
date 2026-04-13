import {
  type EnvironmentProviders,
  inject,
  makeEnvironmentProviders,
  provideAppInitializer,
} from '@angular/core';
import { SPLASH_SCREEN_PORT } from '@core/ports/splash-screen';
import { SplashScreenService } from './splash-screen.service';

/**
 * Provider provideSplashScreen
 *
 * @description
 * Provides the SplashScreenService, exposes the neutral splash
 * screen port, and eagerly initializes it so that router event
 * listeners are attached on startup.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export function provideSplashScreen(): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: SPLASH_SCREEN_PORT,
      useExisting: SplashScreenService,
    },
    provideAppInitializer(() => {
      inject<SplashScreenService>(SplashScreenService);
    }),
  ]);
}
