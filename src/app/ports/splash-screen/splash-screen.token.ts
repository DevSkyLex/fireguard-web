import { InjectionToken, type Signal } from '@angular/core';

/**
 * SplashScreenPort
 * @interface SplashScreenPort
 *
 * @description
 * Neutral port consumed by the shared splash screen component.
 * Concrete splash lifecycle behavior is provided by core infrastructure.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface SplashScreenPort {
  //#region Properties
  /**
   * Property visible
   * @readonly
   *
   * @description
   * Visibility signal for the global splash screen.
   *
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  readonly visible: Signal<boolean>;
  //#endregion
}

/**
 * Constant SPLASH_SCREEN_PORT
 * @const SPLASH_SCREEN_PORT
 *
 * @description
 * Injection token for the neutral splash screen UI port.
 * Bound by core splash screen providers.
 *
 * @type {InjectionToken<SplashScreenPort>}
 */
export const SPLASH_SCREEN_PORT: InjectionToken<SplashScreenPort> =
  new InjectionToken<SplashScreenPort>('SPLASH_SCREEN_PORT');