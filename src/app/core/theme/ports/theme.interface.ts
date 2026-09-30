import type { Signal } from '@angular/core';
import type { ThemeMode } from '../models/theme-mode.type';

/**
 * Interface ThemePort
 * @interface ThemePort
 *
 * @description
 * Neutral contract consumed by shared theme UI.
 * Concrete theme behavior is provided by core infrastructure.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface ThemePort {
  /**
   * Property theme
   * @readonly
   *
   * @description
   * User-selected theme preference, including the unresolved `system` option.
   *
   * @access public
   * @since 0.1.0
   *
   * @type {Signal<ThemeMode>}
   */
  readonly theme: Signal<ThemeMode>;

  /**
   * Property resolvedTheme
   * @readonly
   *
   * @description
   * Concrete applied appearance — always `'light'` or `'dark'`, with
   * `'system'` already resolved through the OS preference. Consumers that
   * cannot read CSS (e.g. canvas charts) use this to theme themselves and
   * react to theme switches.
   *
   * @access public
   * @since 0.1.0
   *
   * @type {Signal<'light' | 'dark'>}
   */
  readonly resolvedTheme: Signal<'light' | 'dark'>;

  /**
   * Method setTheme
   * @method setTheme
   *
   * @description
   * Requests a preference change; the optional origin supplies the center for an explicit
   * appearance transition.
   *
   * @access public
   * @since unreleased
   *
   * @param {ThemeMode} mode - Theme preference to apply, including `system`.
   * @param {{ x: number; y: number } | undefined} origin - Optional transition origin in CSS
   *   pixels.
   *
   * @returns {void} No result is returned.
   */
  setTheme(mode: ThemeMode, origin?: { x: number; y: number }): void;
}
