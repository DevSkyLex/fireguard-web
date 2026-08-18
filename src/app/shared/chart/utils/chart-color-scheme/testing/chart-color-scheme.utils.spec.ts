import { resolveChartColorScheme } from '../chart-color-scheme.utils';

describe('chart-color-scheme utils', () => {
  describe('resolveChartColorScheme', () => {
    it('returns a non-empty ordinal palette for the light appearance', () => {
      const palette: readonly string[] = resolveChartColorScheme('light');

      expect(palette.length).toBeGreaterThan(0);
    });

    it('returns a different palette for the dark appearance', () => {
      const light: readonly string[] = resolveChartColorScheme('light');
      const dark: readonly string[] = resolveChartColorScheme('dark');

      expect(dark).not.toEqual(light);
      expect(dark.length).toBe(light.length);
    });

    it('returns the same reference for repeated calls with the same appearance', () => {
      const first: readonly string[] = resolveChartColorScheme('light');
      const second: readonly string[] = resolveChartColorScheme('light');

      expect(first).toBe(second);
    });
  });
});
