import { InjectionToken, type Signal } from '@angular/core';
import type { ThemeMode } from './theme-mode.type';

/**
 * ThemePort
 * @interface ThemePort
 *
 * @description
 * Neutral port consumed by shared theme UI.
 * Concrete theme behavior is provided by core infrastructure.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface ThemePort {
  //#region Properties
  /**
   * Property theme
   * @readonly
   *
   * @description
   * Current theme mode signal.
   *
   * @since 1.0.0
   *
   * @type {Signal<ThemeMode>}
   */
  readonly theme: Signal<ThemeMode>;
  //#endregion

  //#region Methods
  /**
   * Method setTheme
   * @method setTheme
   *
   * @description
   * Applies the requested theme mode.
   *
   * @since 1.0.0
   *
   * @param {ThemeMode} mode - Theme mode to apply.
   *
   * @returns {void}
   */
  setTheme(mode: ThemeMode): void;
  //#endregion
}

/**
 * Constant THEME_PORT
 * @const THEME_PORT
 *
 * @description
 * Injection token for the neutral theme UI port.
 * Bound by core theme providers.
 *
 * @type {InjectionToken<ThemePort>}
 */
export const THEME_PORT: InjectionToken<ThemePort> =
  new InjectionToken<ThemePort>('THEME_PORT');