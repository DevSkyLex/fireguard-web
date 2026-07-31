import type { ThemeMode } from '../../../models/theme-mode.type';
import { isThemeMode } from '../theme-mode.utils';

/** The catalog `ThemeMode` declares; the guard must accept every member. */
const THEME_MODES: readonly ThemeMode[] = ['light', 'dark', 'system'];

describe('isThemeMode', () => {
  it.each(THEME_MODES)('returns true for the valid theme mode "%s"', (mode) => {
    expect(isThemeMode(mode)).toBe(true);
  });

  it('returns false for a non-string value', () => {
    expect(isThemeMode(42)).toBe(false);
  });

  it('returns false for an unsupported string value', () => {
    expect(isThemeMode('sepia')).toBe(false);
  });
});
