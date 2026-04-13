/**
 * Theme Mode Types
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */

/**
 * Type ThemeMode
 *
 * @description
 * Available theme modes for the application.
 * - light: Light theme
 * - dark: Dark theme
 * - system: Follow system preference
 */
export type ThemeMode = 'light' | 'dark' | 'system';

/** Lookup object for type-safe validation. */
const themeModeLookup: Record<ThemeMode, true> = {
  light: true,
  dark: true,
  system: true,
};

/** Available theme modes as array. */
export const THEME_MODES: readonly ThemeMode[] = ['light', 'dark', 'system'];

/** Type guard for ThemeMode. */
export function isThemeMode(value: unknown): value is ThemeMode {
  return typeof value === 'string' && value in themeModeLookup;
}
