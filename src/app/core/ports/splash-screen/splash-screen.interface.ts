import type { Signal } from '@angular/core';

/**
 * SplashScreenPort
 * @interface SplashScreenPort
 *
 * @description
 * Neutral contract consumed by the shared splash screen component.
 * Concrete splash lifecycle behavior is provided by core infrastructure.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface SplashScreenPort {
  readonly visible: Signal<boolean>;
}
