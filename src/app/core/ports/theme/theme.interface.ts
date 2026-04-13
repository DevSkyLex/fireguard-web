import type { Signal } from '@angular/core';
import type { ThemeMode } from './theme-mode.type';

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

  setTheme(mode: ThemeMode): void;
}
