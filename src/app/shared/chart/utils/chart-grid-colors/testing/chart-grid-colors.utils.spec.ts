import { resolveChartGridColors } from '../chart-grid-colors.utils';

describe('chart-grid-colors utils', () => {
  describe('resolveChartGridColors', () => {
    it('returns border, tick and tooltip colours for the light appearance', () => {
      const grid = resolveChartGridColors('light');

      expect(grid.border).toMatch(/^oklch\(/);
      expect(grid.tick).toMatch(/^oklch\(/);
      expect(grid.tooltipBackground).toMatch(/^oklch\(/);
      expect(grid.tooltipForeground).toMatch(/^oklch\(/);
    });

    it('returns a different set for the dark appearance', () => {
      const light = resolveChartGridColors('light');
      const dark = resolveChartGridColors('dark');

      expect(dark).not.toEqual(light);
    });
  });
});
