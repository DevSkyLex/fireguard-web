import type { ThemeMode } from '../models/theme-mode.type';

/**
 * Theme Mode Utilities
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */

/** Lookup object for type-safe validation. */
const themeModeLookup: Record<ThemeMode, true> = {
  light: true,
  dark: true,
  system: true,
};

/** Available theme modes as array. */
export const THEME_MODES: readonly ThemeMode[] = ['light', 'dark', 'system'];

/**
 * Function isThemeMode
 *
 * @description
 * Type guard narrowing an unknown value to a valid {@link ThemeMode}.
 *
 * @since 1.0.0
 *
 * @param {unknown} value - Candidate value to validate.
 * @returns {boolean} True when the value is a supported theme mode.
 */
export function isThemeMode(value: unknown): value is ThemeMode {
  return typeof value === 'string' && value in themeModeLookup;
}
