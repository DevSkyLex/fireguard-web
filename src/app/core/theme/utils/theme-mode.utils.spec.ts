import { isThemeMode, THEME_MODES } from './theme-mode.utils';

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
