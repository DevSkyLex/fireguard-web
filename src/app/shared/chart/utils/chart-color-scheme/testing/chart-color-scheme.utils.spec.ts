import { ScaleType, type Color } from '@swimlane/ngx-charts';
import { resolveChartColorScheme } from '../chart-color-scheme.utils';

describe('chart-color-scheme utils', () => {
  describe('resolveChartColorScheme', () => {
    it('returns an ordinal, unselectable scheme for the light appearance', () => {
      const scheme: Color = resolveChartColorScheme('light');

      expect(scheme.name).toBe('fireguard-chart');
      expect(scheme.selectable).toBe(false);
      expect(scheme.group).toBe(ScaleType.Ordinal);
      expect(scheme.domain.length).toBeGreaterThan(0);
    });

    it('returns a different domain for the dark appearance', () => {
      const light: Color = resolveChartColorScheme('light');
      const dark: Color = resolveChartColorScheme('dark');

      expect(dark.domain).not.toEqual(light.domain);
      expect(dark.domain.length).toBe(light.domain.length);
    });

    it('returns a fresh domain array each call rather than a shared reference', () => {
      const first: Color = resolveChartColorScheme('light');
      const second: Color = resolveChartColorScheme('light');

      expect(first.domain).toEqual(second.domain);
      expect(first.domain).not.toBe(second.domain);
    });
  });
});
