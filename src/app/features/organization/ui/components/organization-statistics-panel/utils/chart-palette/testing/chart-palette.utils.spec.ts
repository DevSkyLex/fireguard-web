import { resolveChartColor, withChartAlpha } from '../chart-palette.utils';

describe('chart-palette utils', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    document.documentElement.style.removeProperty('--p-primary-color');
    document.documentElement.style.removeProperty('--p-surface-500');
  });

  describe('resolveChartColor', () => {
    it('reads the live CSS custom property from the document root', () => {
      document.documentElement.style.setProperty('--p-primary-color', '#123456');

      expect(resolveChartColor('primary')).toBe('#123456');
    });

    it('falls back to the documented literal when the property has not resolved', () => {
      document.documentElement.style.removeProperty('--p-surface-500');

      expect(resolveChartColor('surface-500')).toBe('#737373');
    });

    it('falls back to the documented literal under SSR evaluation (no document)', () => {
      vi.stubGlobal('document', undefined);

      expect(resolveChartColor('red-500')).toBe('#ef4444');
    });
  });

  describe('withChartAlpha', () => {
    it('converts a hex colour to rgba', () => {
      expect(withChartAlpha('#3b82f6', 0.08)).toBe('rgba(59, 130, 246, 0.08)');
    });

    it('appends the alpha channel to an oklch colour', () => {
      expect(withChartAlpha('oklch(62.3% 0.214 259.815)', 0.5)).toBe(
        'oklch(62.3% 0.214 259.815 / 0.5)',
      );
    });

    it('returns an unrecognized colour format unchanged', () => {
      expect(withChartAlpha('currentColor', 0.5)).toBe('currentColor');
    });
  });
});
