import type { Signal } from '@angular/core';
import type { ThemeMode } from '../models/theme-mode.type';

/**
 * ThemePort
 * @interface ThemePort
 *
 * @description
 * Neutral contract consumed by shared theme UI.
 * Concrete theme behavior is provided by core infrastructure.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface ThemePort {
  readonly theme: Signal<ThemeMode>;

  /**
   * Concrete applied appearance — always `'light'` or `'dark'`, with
   * `'system'` already resolved through the OS preference. Consumers that
   * cannot read CSS (e.g. canvas charts) use this to theme themselves and
   * react to theme switches.
   */
  readonly resolvedTheme: Signal<'light' | 'dark'>;

  setTheme(mode: ThemeMode): void;
}
