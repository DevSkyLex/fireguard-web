import type { Signal } from '@angular/core';

/**
 * Type SplashScreenPhase
 *
 * @description
 * Semantic reason the splash is currently shown, so consumers can
 * surface phase-appropriate messaging without owning lifecycle logic:
 * - `session`  — first boot, while the auth session restores.
 * - `navigation` — a lazy-loaded route transition in progress.
 * - `stalled` — boot exceeded the stall threshold without resolving
 * (offline / unreachable backend); the consumer should surface a
 * failure message and a retry affordance instead of a progress hint.
 *
 * @version 1.1.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @type SplashScreenPhase
 */
export type SplashScreenPhase = 'session' | 'navigation' | 'stalled';

/**
 * Interface SplashScreenPort
 * @interface SplashScreenPort
 *
 * @description
 * Neutral contract consumed by the shared splash screen component.
 * Concrete splash lifecycle behavior is provided by core infrastructure.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface SplashScreenPort {
  /**
   * Property visible
   * @readonly
   *
   * @description
   * Indicates whether the shared splash surface should be displayed.
   *
   * @access public
   * @since 0.1.0
   *
   * @type {Signal<boolean>}
   */
  readonly visible: Signal<boolean>;

  /**
   * Property phase
   * @readonly
   *
   * @description
   * Identifies the boot or navigation condition that determines the splash message and available
   * action.
   *
   * @access public
   * @since 0.1.0
   *
   * @type {Signal<SplashScreenPhase>}
   */
  readonly phase: Signal<SplashScreenPhase>;

  /**
   * Method retry
   * @method retry
   *
   * @description
   * Re-attempts a stalled boot. Invoked from the splash failure state
   * so the user has a way out instead of an indefinite wait.
   *
   * @returns {void}
   */
  retry(): void;
}
