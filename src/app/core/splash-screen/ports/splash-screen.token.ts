import { InjectionToken } from '@angular/core';
import type { SplashScreenPort } from './splash-screen.interface';

/**
 * Constant SPLASH_SCREEN_PORT
 * @const SPLASH_SCREEN_PORT
 *
 * @description
 * Injection token for the core-owned splash screen contract.
 * Bound by core splash screen providers.
 *
 * @type {InjectionToken<SplashScreenPort>}
 */
export const SPLASH_SCREEN_PORT: InjectionToken<SplashScreenPort> =
  new InjectionToken<SplashScreenPort>('SPLASH_SCREEN_PORT');
